// -- APPLE HEALTH IMPORT -------------------------------------------------------
// Parses Apple Health export XML to extract cycle and weight data — the
// only two things AppleHealthImportCard.tsx actually imports into the
// app (via importWeightEntries/importCycleLogs). Supports both raw
// .xml and .zip, on web AND native.
//
// The reading strategy is deliberately unified across platforms rather than
// branched: expo-file-system's `File` class implements the standard `Blob`
// interface (`.slice()`, `.text()`, `.arrayBuffer()`) on native, exactly like
// a browser `File` does on web. That means the same chunked-reading code
// works for both — construct a `File`/native path once, then everything
// downstream is platform-agnostic.

/**
 * Web-only: picks a file via a bare `<input type="file">`, bypassing
 * expo-document-picker's web implementation entirely.
 *
 * expo-document-picker's web fallback (ExpoDocumentPicker.web.ts) reads
 * every picked file through `FileReader.readAsDataURL()` before handing
 * it back — that loads the *entire* file into memory and base64-encodes
 * it (~33% larger than the original) as a single string, regardless of
 * what the caller actually needs it for. A real Apple Health export is
 * routinely several hundred MB to multiple GB (see MAX_FILE_SIZE
 * above) — forcing one of those through readAsDataURL is exactly the
 * kind of memory spike that crashes a mobile browser tab outright, with
 * no JS exception for any try/catch here to even catch. All the
 * chunked-streaming work below (`parsePlainXmlFile`, `parseZipFile`) is
 * pointless if the file has already been fully loaded and bloated
 * before it gets there — so for this import specifically, get the raw
 * File directly instead and skip that step entirely.
 */
export function pickWebFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => {
      input.removeEventListener('change', handleChange);
      document.body.removeChild(input);
    };
    const handleChange = () => {
      const file = input.files?.[0] || null;
      cleanup();
      resolve(file);
    };
    input.addEventListener('change', handleChange);
    // No 'cancel' event wired here (unlike expo-document-picker's own
    // web fallback) — browser support for the file input 'cancel' event
    // is inconsistent, and resolving null only on a real change event
    // is the safer default: a person who dismisses the picker just
    // sees the button return to normal, no different from any other
    // no-op cancel elsewhere in this flow.
    input.click();
  });
}

export interface AppleHealthImportResult {
  periodDates: Set<string>;
  ovulationDates: Set<string>;
  weightByDate: Record<string, number>; // lbs
}

function parseHealthDate(raw: string | undefined | null): string | null {
  return raw ? raw.slice(0, 10) : null;
}

function healthAttr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m?.[1] ?? '';
}

const HEALTH_TAG_RE = /<Record [^>]+\/?>/g;

// The only three Health record types this app has any use for. A real
// export.xml is typically dominated by record types this app never
// reads (step count, heart rate, workouts, distance, sleep analysis,
// flights climbed, etc.) — often the large majority of records in a
// full export. Type is checked against this set FIRST, before
// extracting anything else from the tag, so a record this app doesn't
// care about costs exactly one regex match (the type check) instead of
// several (value, startDate, endDate, unit) that would just be thrown
// away. Sleep analysis used to be parsed here too, but nothing
// downstream ever read it — AppleHealthImportCard only imports weight
// and cycle data — so it's excluded rather than extracted and discarded.
const NEEDED_TYPES = new Set([
  'HKCategoryTypeIdentifierMenstrualFlow',
  'HKCategoryTypeIdentifierOvulationTestResult',
  'HKQuantityTypeIdentifierBodyMass',
]);

/**
 * Processes one chunk of export.xml text, updating `state` in place.
 * Returns the leftover tail of the buffer (in case a <Record> tag got
 * split across a chunk boundary) so the caller prepends it to the next
 * chunk.
 */
// Tracks the raw startDate timestamp last used to set each day's
// weight, so a later reading on the same day can correctly replace an
// earlier one. Keyed by the state object itself (WeakMap, not a
// plain object) so this never leaks between separate imports and
// needs no explicit cleanup — it's garbage collected right along with
// the state object once the import finishes. Kept out of the public
// AppleHealthImportResult shape since the one real consumer
// (AppleHealthImportCard.tsx) only reads weightByDate via
// Object.entries and has no use for the raw timestamps.
const lastWeightTimestampByState = new WeakMap<AppleHealthImportResult, Record<string, string>>();

export function extractHealthRecordsFromChunk(buffer: string, state: AppleHealthImportResult): string {
  HEALTH_TAG_RE.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = HEALTH_TAG_RE.exec(buffer)) !== null) {
    const tag = match[0];
    lastIndex = HEALTH_TAG_RE.lastIndex;

    const type = healthAttr(tag, 'type');
    if (!NEEDED_TYPES.has(type)) continue; // skip every field this app doesn't read

    const start = healthAttr(tag, 'startDate');
    const date = parseHealthDate(start);
    if (!date) continue;
    const value = healthAttr(tag, 'value');

    if (type === 'HKCategoryTypeIdentifierMenstrualFlow') {
      if (value && value !== 'HKCategoryValueMenstrualFlowNone') {
        state.periodDates.add(date);
      }
    } else if (type === 'HKCategoryTypeIdentifierOvulationTestResult') {
      if (value === 'HKCategoryValueOvulationTestResultPositive') {
        state.ovulationDates.add(date);
      }
    } else if (type === 'HKQuantityTypeIdentifierBodyMass') {
      const val = parseFloat(value);
      const unit = healthAttr(tag, 'unit');
      if (val > 0) {
        // Previously kept whichever reading for a given day was
        // encountered first while streaming — essentially arbitrary
        // file order, not necessarily the most meaningful one. Now
        // compares the actual startDate timestamp so the latest
        // reading of the day wins regardless of what order records
        // happen to appear in the export.
        let timestamps = lastWeightTimestampByState.get(state);
        if (!timestamps) {
          timestamps = {};
          lastWeightTimestampByState.set(state, timestamps);
        }
        const existingTimestamp = timestamps[date];
        if (!existingTimestamp || start > existingTimestamp) {
          const lbs = unit.startsWith('kg') ? val * 2.20462 : val;
          state.weightByDate[date] = parseFloat(lbs.toFixed(1));
          timestamps[date] = start;
        }
      }
    }
  }

  const leftover = buffer.slice(lastIndex);
  return leftover.length > 200_000 ? leftover.slice(-200_000) : leftover;
}

export function newHealthState(): AppleHealthImportResult {
  return { periodDates: new Set(), ovulationDates: new Set(), weightByDate: {} };
}

/** Minimal shape this module actually needs — satisfied by both a web File and expo-file-system's File. */
interface BlobLike {
  size: number;
  slice(start?: number, end?: number): { text(): Promise<string> };
  arrayBuffer(): Promise<ArrayBuffer>;
}

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB per slice

// A raised, generous ceiling rather than no ceiling at all — a real
// multi-year Apple Health export (especially with Apple Watch data)
// can legitimately land well past the old 500MB cutoff, and the plain
// .xml path below is fully streamed/chunked, so file size alone isn't
// actually a memory risk there. 3GB is comfortably past what even a
// heavy, years-long export produces; this exists as a sanity backstop
// against a corrupted or wrong file, not a real expected ceiling.
const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB safety ceiling

/**
 * Reads a plain (non-zip) file in chunks via .slice().text() — the
 * standard Blob interface, identical on web File and expo-file-system's
 * File. Never holds more than one chunk in memory at a time, so an
 * 800MB+ export is fine either way.
 */
async function parsePlainXmlFile(file: BlobLike, onProgress?: (fraction: number) => void): Promise<AppleHealthImportResult> {
  const state = newHealthState();
  let buffer = '';
  let offset = 0;
  let sawAnyText = false;

  while (offset < file.size) {
    const text = await file.slice(offset, offset + CHUNK_SIZE).text();
    if (text) sawAnyText = true;
    buffer = extractHealthRecordsFromChunk(buffer + text, state);
    offset += CHUNK_SIZE;
    if (onProgress) onProgress(Math.min(1, offset / file.size));
  }
  if (buffer) extractHealthRecordsFromChunk(buffer, state);

  if (!sawAnyText) {
    throw new Error('No data received — please try again.');
  }
  return state;
}

/**
 * Extracts export.xml from a .zip and parses it. The compressed zip
 * bytes themselves (file.arrayBuffer() below) can't be streamed —
 * zip's central-directory format requires the whole compressed buffer
 * before any entry can even be located, that's inherent to the
 * format, not something JSZip could stream around. But the
 * *decompressed* XML is the far larger memory cost (health export XML
 * routinely decompresses to several times its compressed size), and
 * that part genuinely streams via JSZip's internalStream — verified
 * directly against a real generated zip: real incremental chunks
 * (~16KB each), never the whole decompressed file materialized at
 * once, unlike the previous `.async('string')` call this replaces.
 */
async function parseZipFile(file: BlobLike, onProgress?: (fraction: number) => void): Promise<AppleHealthImportResult> {
  const JSZip = (await import('jszip')).default;
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const xmlFile = zip.file('apple_health_export/export.xml');
  if (!xmlFile) {
    throw new Error(
      "Could not find export.xml inside the zip. Make sure this is the export from the Health app's \"Export All Health Data.\""
    );
  }

  const state = newHealthState();
  let leftover = '';
  let sawAnyText = false;
  // Compressed size is a reasonable stand-in for progress even though
  // decompressed bytes are what's actually streaming — the exact
  // decompressed total isn't known upfront without defeating the
  // point of streaming it, and compressed-size-based progress is
  // still a meaningful, monotonically-increasing signal for the UI.
  const approxTotal = (xmlFile as unknown as { _data?: { uncompressedSize?: number; compressedSize?: number } })._data;
  const totalForProgress = approxTotal?.uncompressedSize || approxTotal?.compressedSize || 1;
  let processedBytes = 0;

  await new Promise<void>((resolve, reject) => {
    (xmlFile as unknown as {
      internalStream: (type: 'string') => {
        on: (event: 'data' | 'error' | 'end', cb: (arg?: any) => void) => any;
        resume: () => void;
      };
    })
      .internalStream('string')
      .on('data', (chunk: string) => {
        sawAnyText = true;
        processedBytes += chunk.length;
        leftover = extractHealthRecordsFromChunk(leftover + chunk, state);
        if (onProgress) onProgress(Math.min(1, processedBytes / totalForProgress));
      })
      .on('error', (err: Error) => reject(err))
      .on('end', () => resolve())
      .resume();
  });
  if (leftover) extractHealthRecordsFromChunk(leftover, state);

  if (!sawAnyText) {
    throw new Error('No data received — please try again.');
  }
  return state;
}

/**
 * Top-level entry point. Accepts a web File directly, or (on native) call
 * `openNativeHealthFile` first to get a Blob-compatible wrapper around the
 * picked document's URI.
 */
export async function parseAppleHealthFile(
  file: BlobLike & { name?: string; type?: string },
  onProgress?: (fraction: number) => void
): Promise<AppleHealthImportResult> {
  if (file.size === 0) {
    throw new Error('That file is empty — please try exporting again.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('That file is larger than this can handle (3GB+) — double check it\'s the real Health export and not something else. Contact support if it genuinely is and this is your only option.');
  }

  const isZip = file.name?.toLowerCase().endsWith('.zip') || file.type === 'application/zip';
  return isZip ? parseZipFile(file, onProgress) : parsePlainXmlFile(file, onProgress);
}

/**
 * Native-only: wraps a picked document's file:// URI in expo-file-system's
 * `File` class, which implements the same Blob interface (`.slice()`,
 * `.text()`, `.arrayBuffer()`, `.size`) that the code above already expects
 * from a web File — so nothing above this needs to know which platform it's
 * running on.
 */
export async function openNativeHealthFile(uri: string, name: string): Promise<BlobLike & { name: string; type?: string }> {
  const { File } = await import('expo-file-system');
  const file = new File(uri);
  return Object.assign(file, { name }) as unknown as BlobLike & { name: string; type?: string };
}
