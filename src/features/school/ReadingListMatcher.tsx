import { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Platform, Image } from 'react-native';
import { avivaBrain, type ReadingListItem } from '@/core/ai/AvivaBrain';
import { describeAiFailure } from '@/core/ai/describeAiFailure';
import { pickSyllabusImageFromLibrary, captureSyllabusPhoto } from './syllabusImageImport';
import { pickAndExtractReadingSource, type ReadingSourceKind, type ReadingSourceResult } from './readingSourceDispatcher';
import { fetchAndExtractLinkText } from './syllabusLinkImport';

interface MatchState {
  item: ReadingListItem;
  status: 'pending' | 'matching' | 'matched' | 'error';
  result: ReadingSourceResult | null;
  error: string | null;
  linkInput: string;
  showLinkInput: boolean;
}

function describeRequestedScope(item: ReadingListItem): string | null {
  if (item.startPage != null && item.endPage != null) return `pages ${item.startPage}–${item.endPage}`;
  if (item.sectionLabel) return item.sectionLabel;
  if (item.url) return item.url;
  return null;
}

const KIND_OPTIONS: { kind: ReadingSourceKind; label: string; emoji: string }[] = [
  { kind: 'pdf', label: 'PDF', emoji: '📄' },
  { kind: 'docx', label: 'Word', emoji: '📃' },
  { kind: 'epub', label: 'ePub', emoji: '📚' },
  { kind: 'txt', label: '.txt', emoji: '📎' },
];

interface ReadingListMatcherProps {
  /** Called once a match's text has been extracted — the caller (CourseDetailScreen) runs it through summarizeReadingToNotes and appends it, same as every other reading-upload path already does. */
  onMatched: (label: string, rawText: string) => Promise<void>;
}

/**
 * For a screenshot like a "Readings & Resources" page that names
 * several separate sources at once (see the conversation this was
 * built from) — identifies every item first, then lets the person
 * upload or link a file per item, scoping extraction to whatever page
 * range or chapter that item specified. Each item's status (matched,
 * not found in the uploaded file, or still pending) is shown
 * individually, since a real reading list rarely resolves perfectly
 * for every source on the first try.
 */
export default function ReadingListMatcher({ onMatched }: ReadingListMatcherProps) {
  const [expanded, setExpanded] = useState(false);
  const [listImagePreview, setListImagePreview] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchState[]>([]);

  const runIdentifyList = async (picker: () => Promise<{ dataUrl: string } | null>) => {
    setIdentifyError(null);
    try {
      const picked = await picker();
      if (!picked) return;
      setListImagePreview(picked.dataUrl);
      setIdentifying(true);
      const list = await avivaBrain.identifyReadingList(picked.dataUrl);
      setIdentifying(false);
      if (!list) {
        setIdentifyError(describeAiFailure(avivaBrain.lastErrorReason));
        return;
      }
      if (!list.confident || !list.items.length) {
        setIdentifyError(list.reasoning || "Couldn't confidently identify any reading items in that screenshot — try a clearer photo of the reading list.");
        return;
      }
      setMatches(list.items.map((item) => ({ item, status: 'pending', result: null, error: null, linkInput: item.url || '', showLinkInput: false })));
    } catch (error: any) {
      setIdentifying(false);
      console.error('ReadingListMatcher: failed to identify reading list', error);
      setIdentifyError(error?.message === 'PERMISSION_DENIED' ? 'Photo access was denied — allow it from your device settings.' : "Couldn't read that image. Try a clearer photo.");
    }
  };

  const updateMatch = (index: number, updates: Partial<MatchState>) => {
    setMatches((prev) => prev.map((m, i) => (i === index ? { ...m, ...updates } : m)));
  };

  const handlePickForItem = async (index: number, kind: ReadingSourceKind) => {
    const match = matches[index];
    if (!match) return;
    updateMatch(index, { status: 'matching', error: null });
    try {
      const result = await pickAndExtractReadingSource(kind, match.item);
      if (!result) {
        updateMatch(index, { status: 'pending' }); // person canceled the picker — not an error
        return;
      }
      updateMatch(index, { status: 'matched', result });
      await onMatched(match.item.sourceLabel, result.text);
    } catch (error: any) {
      let message = "Couldn't read that file.";
      if (error?.message === 'LOOKS_SCANNED') message = "That PDF doesn't seem to have real text in it — it's probably scanned. Try a different format.";
      if (error?.message === 'NO_TEXT') message = "That file didn't have any readable text in it.";
      console.error('ReadingListMatcher: failed to extract matched source', error);
      updateMatch(index, { status: 'error', error: message });
    }
  };

  const handleLinkForItem = async (index: number) => {
    const match = matches[index];
    if (!match || !match.linkInput.trim()) return;
    updateMatch(index, { status: 'matching', error: null });
    try {
      const result = await fetchAndExtractLinkText(match.linkInput);
      if (!result) {
        updateMatch(index, { status: 'pending' });
        return;
      }
      const sourceResult: ReadingSourceResult = { name: result.title || result.url, text: result.text, scopeStatus: 'whole_document', scopeDescription: null };
      updateMatch(index, { status: 'matched', result: sourceResult });
      await onMatched(match.item.sourceLabel, result.text);
    } catch (error: any) {
      let message = "Couldn't reach that page — many course sites don't allow this. Try a screenshot of the page instead.";
      if (error?.message === 'INVALID_URL') message = 'That needs to be a full link starting with http:// or https://.';
      if (error?.message === 'NO_READABLE_TEXT') message = "Couldn't find real readable text on that page — try a screenshot instead.";
      console.error('ReadingListMatcher: failed to fetch link for item', error);
      updateMatch(index, { status: 'error', error: message });
    }
  };

  if (!expanded) {
    return (
      <Pressable onPress={() => setExpanded(true)} className="border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2.5 items-center mb-2">
        <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">📋 Upload a reading list (multiple sources)</Text>
      </Pressable>
    );
  }

  return (
    <View className="bg-stone-50 dark:bg-slate-800 rounded-xl p-3 mb-2">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-slate-700 dark:text-slate-300 text-xs font-semibold">📋 Reading list</Text>
        <Pressable onPress={() => { setExpanded(false); setMatches([]); setListImagePreview(null); setIdentifyError(null); }}>
          <Text className="text-slate-400 text-xs">Close</Text>
        </Pressable>
      </View>

      {matches.length === 0 && (
        <>
          <Text className="text-slate-500 text-xs mb-2">
            Upload a screenshot of a reading list (like a "Readings & Resources" page) that names a few different sources — you'll upload or link each one separately after.
          </Text>
          <View className="flex-row gap-2 mb-2">
            <Pressable onPress={() => runIdentifyList(pickSyllabusImageFromLibrary)} disabled={identifying} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2 items-center">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">🖼️ Upload screenshot</Text>
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable onPress={() => runIdentifyList(captureSyllabusPhoto)} disabled={identifying} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2 items-center">
                <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">📷 Take photo</Text>
              </Pressable>
            )}
          </View>
          {listImagePreview && (
            <View className="mb-2">
              <Image source={{ uri: listImagePreview }} style={{ width: 48, height: 48, borderRadius: 8 }} />
            </View>
          )}
          {identifying && (
            <View className="flex-row items-center gap-2 mb-2">
              <ActivityIndicator size="small" />
              <Text className="text-slate-500 text-xs">Reading the list…</Text>
            </View>
          )}
          {identifyError && <Text className="text-amber-600 dark:text-amber-400 text-xs">{identifyError}</Text>}
        </>
      )}

      {matches.length > 0 && (
        <View className="gap-2">
          {matches.map((match, index) => {
            const requestedScope = describeRequestedScope(match.item);
            return (
              <View key={index} className="bg-white dark:bg-slate-900 rounded-lg p-3">
                <Text className="text-slate-900 dark:text-slate-100 text-sm font-medium mb-0.5">{match.item.sourceLabel}</Text>
                {requestedScope && <Text className="text-slate-500 text-xs mb-2">{requestedScope}</Text>}

                {match.status === 'matched' && match.result && (
                  <Text className="text-emerald-700 dark:text-emerald-400 text-xs">
                    ✓ Added to notes{match.result.scopeStatus === 'scoped' && match.result.scopeDescription ? ` — used ${match.result.scopeDescription}` : ''}
                    {match.result.scopeStatus === 'not_found' ? " — couldn't find that section, used the whole document instead" : ''}
                  </Text>
                )}

                {match.status === 'matching' && (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" />
                    <Text className="text-slate-500 text-xs">Reading and taking notes…</Text>
                  </View>
                )}

                {(match.status === 'pending' || match.status === 'error') && (
                  <>
                    <View className="flex-row flex-wrap gap-1.5 mb-1.5">
                      {KIND_OPTIONS.map((opt) => (
                        <Pressable key={opt.kind} onPress={() => handlePickForItem(index, opt.kind)} className="border border-stone-300 dark:border-slate-700 rounded-lg py-1.5 px-2.5">
                          <Text className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">{opt.emoji} {opt.label}</Text>
                        </Pressable>
                      ))}
                      <Pressable onPress={() => updateMatch(index, { showLinkInput: !match.showLinkInput })} className="border border-stone-300 dark:border-slate-700 rounded-lg py-1.5 px-2.5">
                        <Text className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">🔗 Link</Text>
                      </Pressable>
                    </View>
                    {match.showLinkInput && (
                      <View className="flex-row gap-1.5 mb-1">
                        <TextInput
                          value={match.linkInput}
                          onChangeText={(v) => updateMatch(index, { linkInput: v })}
                          placeholder="https://…"
                          placeholderTextColor="#64748b"
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="url"
                          className="flex-1 bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1.5 text-xs"
                        />
                        <Pressable
                          onPress={() => handleLinkForItem(index)}
                          disabled={!match.linkInput.trim()}
                          className={!match.linkInput.trim() ? 'bg-slate-300 dark:bg-slate-700 rounded-lg px-3 justify-center' : 'bg-indigo-600 rounded-lg px-3 justify-center'}
                        >
                          <Text className="text-white text-[11px] font-semibold">Go</Text>
                        </Pressable>
                      </View>
                    )}
                    {match.error && <Text className="text-amber-600 dark:text-amber-400 text-[11px]">{match.error}</Text>}
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
