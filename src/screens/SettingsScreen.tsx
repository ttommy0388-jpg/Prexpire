import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { CATEGORY_IDS, CATEGORY_NAMES, useItems } from '../items';
import { useSettings } from '../settings';
import {
  DATE_FORMAT_LABELS,
  DATE_FORMATS,
  exportFileName,
  itemsToCsv,
  itemsToJson,
  REMINDER_LEADS,
  reminderLeadLabel,
  SORT_LABELS,
  SORT_ORDERS,
  WARNING_DAYS,
  type DefaultCategory,
} from '../preferences';
import { isoToday } from '../scanner/dateParser';
import { Page } from '../components/Page';
import { accents, IconTile, Note, Options, SettingRow, SettingsCard, SettingsSection, SmallButton, Toggle } from '../components/SettingsRows';
import { notificationStatus, requestNotificationPermission, watchNotificationStatus, type NotificationStatus } from '../platform/notifications';
import { saveTextFile } from '../platform/saveFile';
import appConfig from '../../app.json';

const wordmark = require('../../assets/wordmark.png');
const APP_VERSION: string = appConfig.expo.version;
const WEB = Platform.OS === 'web';

type Props = { badge: number; onNavigate: (route: string) => void };

export function SettingsScreen({ badge, onNavigate }: Props) {
  const { settings, update, saveError, systemReduceMotion, formatDate, reset } = useSettings();
  const { saved, clearSaved } = useItems();
  const [confirmClear, setConfirmClear] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportAs = async (kind: 'json' | 'csv') => {
    setExportError(null);
    const now = new Date();
    try {
      if (kind === 'json') await saveTextFile(exportFileName('json', now), 'application/json', itemsToJson(saved, now, APP_VERSION));
      else await saveTextFile(exportFileName('csv', now), 'text/csv', itemsToCsv(saved, CATEGORY_NAMES));
    } catch {
      setExportError('The file could not be created. Your browser may be blocking downloads on this page.');
    }
  };

  return (
    <Page title="Settings" subtitle="Make PREXPIRE work for you." badge={badge} onNavigate={onNavigate}>
      {saveError && (
        <View style={s.banner} accessibilityRole="alert">
          <Note tone="warn">Your last change couldn't be saved in this browser's storage. It applies until you close the page.</Note>
        </View>
      )}

      <View style={s.profile}>
        <IconTile icon="person" accent="mint" size={48} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.profileTitle}>Your preferences</Text>
          <Text style={s.profileSub}>
            {WEB ? 'Saved in this browser' : 'Saved on this device'}. No account needed.
          </Text>
        </View>
        <View style={s.profileStat}>
          <Text style={s.profileCount}>{saved.length}</Text>
          <Text style={s.profileCountLabel}>{saved.length === 1 ? 'item added' : 'items added'}</Text>
        </View>
      </View>

      <SettingsSection title="Notifications">
        <SettingsCard>
          <SettingRow
            icon="notifications"
            accent="amber"
            title="Expiry reminders"
            description="Get notified before items expire."
            right={<Toggle label="Expiry reminders" value={settings.reminders} onChange={(v) => update({ reminders: v })} />}
            below={
              <Note>
                {settings.reminders
                  ? 'Due reminders appear in the Reminders tab and its badge. PREXPIRE does not send notifications yet.'
                  : 'Off. The Reminders tab lists nothing and its badge stays clear.'}
              </Note>
            }
          />
          <SettingRow
            icon="time"
            accent="amber"
            title="Reminder timing"
            description="Choose when reminders arrive."
            below={
              <Options
                label="Reminder timing"
                value={settings.reminderLead}
                onChange={(v) => update({ reminderLead: v })}
                options={REMINDER_LEADS.map((l) => ({ value: l, label: reminderLeadLabel(l), disabled: !settings.reminders }))}
              />
            }
          />
          <SettingRow
            icon="today"
            accent="amber"
            title="Daily summary"
            description="See what's expiring soon."
            right={<Toggle label="Daily summary" value={settings.dailySummary} onChange={(v) => update({ dailySummary: v })} />}
            below={settings.dailySummary ? <Note>Saved. A daily summary needs notification delivery, which isn't built yet, so none is sent.</Note> : undefined}
          />
          <BrowserNotificationsRow />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingsCard>
          <SettingRow
            icon="contrast"
            accent="purple"
            title="Theme"
            description="PREXPIRE's dark look."
            below={
              <>
                <Options
                  label="Theme"
                  value="dark"
                  onChange={() => {}}
                  options={[
                    { value: 'dark', label: 'Dark' },
                    { value: 'light', label: 'Light', disabled: true },
                    { value: 'system', label: 'System', disabled: true },
                  ]}
                />
                <Note>Only the dark theme exists for now. Light and System will be selectable once the app has a light design.</Note>
              </>
            }
          />
          <SettingRow
            icon="reorder-four"
            accent="blue"
            title="Compact layout"
            description="Shorter rows in item lists."
            right={<Toggle label="Compact layout" value={settings.compact} onChange={(v) => update({ compact: v })} />}
          />
          <SettingRow
            icon="sparkles"
            accent="purple"
            title="Animations"
            description="Fades and the scanner's sweep line."
            right={
              <Toggle
                label="Animations"
                value={settings.animations && !systemReduceMotion}
                disabled={systemReduceMotion}
                onChange={(v) => update({ animations: v })}
              />
            }
            below={systemReduceMotion ? <Note>Your device asks for reduced motion, so animations stay off.</Note> : undefined}
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Expiry preferences">
        <SettingsCard>
          <SettingRow
            icon="hourglass"
            accent="mint"
            title="Default warning period"
            description="Items count as expiring soon this far ahead."
            below={
              <Options
                label="Default warning period"
                value={settings.warningDays}
                onChange={(v) => update({ warningDays: v })}
                options={WARNING_DAYS.map((d) => ({ value: d, label: `${d} days` }))}
              />
            }
          />
          <SettingRow
            icon="calendar"
            accent="mint"
            title="Date format"
            description={`Today shows as ${formatDate(isoToday(new Date()))}.`}
            below={
              <Options
                label="Date format"
                value={settings.dateFormat}
                onChange={(v) => update({ dateFormat: v })}
                options={DATE_FORMATS.map((f) => ({ value: f, label: DATE_FORMAT_LABELS[f] }))}
              />
            }
          />
          <SettingRow
            icon="swap-vertical"
            accent="mint"
            title="Default sorting"
            description="Order of the Items list."
            below={
              <Options
                label="Default sorting"
                value={settings.sort}
                onChange={(v) => update({ sort: v })}
                options={SORT_ORDERS.map((o) => ({ value: o, label: SORT_LABELS[o] }))}
              />
            }
          />
          <SettingRow
            icon="eye"
            accent="mint"
            title="Show expired items"
            description="Keep expired items in the Home and Items lists."
            right={<Toggle label="Show expired items" value={settings.showExpired} onChange={(v) => update({ showExpired: v })} />}
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Categories and inventory">
        <SettingsCard>
          <SettingRow
            icon="grid"
            accent="blue"
            title="Browse categories"
            description="Food, Medicine, Household, Skincare and Pantry. Custom categories aren't supported yet."
            onPress={() => onNavigate('tab:items')}
          />
          <SettingRow
            icon="pricetag"
            accent="blue"
            title="Default category"
            description="Preselected when you add an item."
            below={
              <Options<DefaultCategory>
                label="Default category"
                value={settings.defaultCategory}
                onChange={(v) => update({ defaultCategory: v })}
                options={[{ value: 'last', label: 'Last used' }, ...CATEGORY_IDS.map((id) => ({ value: id, label: CATEGORY_NAMES[id] }))]}
              />
            }
          />
          <SettingRow
            icon="flask"
            accent="blue"
            title="Show sample items"
            description="The example items Oat milk, Ibuprofen and Bread."
            right={<Toggle label="Show sample items" value={settings.showSamples} onChange={(v) => update({ showSamples: v })} />}
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Privacy and data">
        <SettingsCard>
          <SettingRow
            icon="camera"
            accent="teal"
            title="Camera access"
            description={
              WEB
                ? "The scanner asks your browser for the camera when you open it. Frames are read in the browser and never uploaded. To change access, use your browser's site settings."
                : 'The scanner asks for the camera when you open it. Frames are read on the device and never uploaded. To change access, use the Settings app.'
            }
            below={<SmallButton label="Open scanner" icon="scan-outline" onPress={() => onNavigate('scan')} />}
          />
          <SettingRow
            icon="server"
            accent="teal"
            title="Data storage"
            description={
              WEB
                ? "Items and settings are stored only in this browser's local storage, on this device. Nothing is uploaded, synced or backed up, and clearing your browser data removes them."
                : 'Items and settings are stored only on this device. Nothing is uploaded, synced or backed up.'
            }
          />
          <SettingRow
            icon="download"
            accent="teal"
            title="Export data"
            description={saved.length ? `Download your ${saved.length} added ${saved.length === 1 ? 'item' : 'items'}: name, category, expiry date, date precision, when added and source.` : 'Nothing to export yet. Items you add will be exported here (sample items are not included).'}
            below={
              <>
                <View style={s.buttons}>
                  <SmallButton label="JSON" icon="code-slash" disabled={!saved.length} onPress={() => exportAs('json')} accessibilityLabel="Export items as JSON" />
                  <SmallButton label="CSV" icon="document-text" disabled={!saved.length} onPress={() => exportAs('csv')} accessibilityLabel="Export items as CSV" />
                </View>
                {exportError && <Note tone="warn">{exportError}</Note>}
              </>
            }
          />
        </SettingsCard>
        <View style={{ height: 12 }} />
        <SettingsCard danger>
          <SettingRow
            icon="trash"
            accent="red"
            title="Clear all data"
            titleColor={accents.red}
            description="Delete your added items and reset every setting."
            onPress={() => setConfirmClear(true)}
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsCard>
          <View style={s.about}>
            <Image source={wordmark} style={s.aboutLogo} resizeMode="contain" accessibilityLabel="PREXPIRE" />
            <Text style={s.aboutText}>Keep track of what matters before it expires.</Text>
            <Text style={s.aboutVersion}>Version {APP_VERSION}</Text>
          </View>
        </SettingsCard>
      </SettingsSection>

      <ClearDataDialog
        visible={confirmClear}
        itemCount={saved.length}
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          await clearSaved();
          await reset();
          setConfirmClear(false);
        }}
      />
    </Page>
  );
}

function BrowserNotificationsRow() {
  const [status, setStatus] = useState<NotificationStatus>(notificationStatus);
  const [asking, setAsking] = useState(false);
  const refresh = useCallback(() => setStatus(notificationStatus()), []);
  useEffect(() => watchNotificationStatus(refresh), [refresh]);

  const ask = async () => {
    setAsking(true);
    setStatus(await requestNotificationPermission());
    setAsking(false);
  };

  const label: Record<NotificationStatus, string> = {
    granted: 'Allowed',
    denied: 'Blocked',
    default: 'Not set',
    unsupported: 'Unavailable',
    insecure: 'Unavailable',
  };
  const note: Record<NotificationStatus, { text: string; tone: 'ok' | 'warn' | 'muted' }> = {
    granted: { text: 'This browser allows PREXPIRE to show notifications. None are sent yet, because reminder delivery is not built.', tone: 'ok' },
    denied: { text: "Notifications are blocked for this site. To allow them, change the site's notification setting in your browser, then come back.", tone: 'warn' },
    default: { text: 'Your browser will ask for permission when you select Allow. Nothing is sent yet; this only prepares the browser.', tone: 'muted' },
    unsupported: { text: WEB ? "This browser doesn't support web notifications." : 'Notifications are not set up in this version of the app.', tone: 'muted' },
    insecure: { text: 'Browsers only allow notifications on secure (https) pages.', tone: 'muted' },
  };

  return (
    <SettingRow
      icon="globe"
      accent="amber"
      title={WEB ? 'Browser notifications' : 'Notifications'}
      description={WEB ? 'Allow notifications from this browser.' : 'Allow notifications on this device.'}
      right={
        <View style={[s.status, status === 'granted' && s.statusOk, status === 'denied' && s.statusWarn]} accessibilityLabel={`Permission: ${label[status]}`}>
          <Text style={[s.statusText, status === 'granted' && { color: colors.mint }, status === 'denied' && { color: colors.amberText }]}>{label[status]}</Text>
        </View>
      }
      below={
        <>
          <Note tone={note[status].tone}>{note[status].text}</Note>
          {status === 'default' && (
            <View style={s.buttons}>
              <SmallButton label={asking ? 'Waiting for browser…' : 'Allow notifications'} icon="notifications-outline" tone="mint" disabled={asking} onPress={ask} />
            </View>
          )}
        </>
      }
    />
  );
}

type DialogProps = { visible: boolean; itemCount: number; onCancel: () => void; onConfirm: () => Promise<void> };

function ClearDataDialog({ visible, itemCount, onCancel, onConfirm }: DialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (visible) setError(false);
  }, [visible]);

  const confirm = async () => {
    setBusy(true);
    setError(false);
    try {
      await onConfirm();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? () => {} : onCancel}>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onCancel} accessibilityLabel="Close" importantForAccessibility="no" />
        <View style={s.dialog} accessibilityRole={'dialog' as never} accessibilityLabel="Clear all data" {...({ 'aria-modal': true } as object)}>
          <IconTile icon="trash" accent="red" size={44} />
          <Text style={s.dialogTitle} accessibilityRole="header">
            Clear all data?
          </Text>
          <Text style={s.dialogText}>This permanently deletes from {WEB ? 'this browser' : 'this device'}:</Text>
          <View style={s.dialogList}>
            <Text style={s.dialogText}>•  {itemCount === 1 ? '1 item you added' : `${itemCount} items you added`}</Text>
            <Text style={s.dialogText}>•  Every setting on this page (back to the defaults)</Text>
            <Text style={s.dialogText}>•  The remembered last-used category</Text>
          </View>
          <Text style={s.dialogMuted}>Sample items are not stored, so they show again. This can't be undone; export your items first if you want a copy.</Text>
          {error && <Note tone="warn">Nothing could be deleted because this browser's storage refused the change. Try again.</Note>}
          <View style={s.dialogButtons}>
            <SmallButton label="Cancel" onPress={onCancel} disabled={busy} />
            <SmallButton label={busy ? 'Deleting…' : 'Delete everything'} icon="trash-outline" tone="danger" onPress={confirm} disabled={busy} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  banner: { backgroundColor: '#231E11', borderColor: '#5C4512', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  profileTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  profileSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  profileStat: { alignItems: 'flex-end' },
  profileCount: { color: colors.text, fontSize: 20, fontWeight: '700' },
  profileCountLabel: { color: colors.textMuted, fontSize: 12 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  status: { paddingHorizontal: 10, height: 26, borderRadius: 999, borderWidth: 1, borderColor: colors.surfaceBorder, justifyContent: 'center' },
  statusOk: { borderColor: 'rgba(46,232,182,0.45)', backgroundColor: 'rgba(46,232,182,0.08)' },
  statusWarn: { borderColor: '#7A5A12', backgroundColor: '#3D2B0E' },
  statusText: { color: colors.textMuted, fontSize: 12.5, fontWeight: '600' },
  about: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, gap: 8 },
  aboutLogo: { width: 150, height: 38 },
  aboutText: { color: colors.text, fontSize: 14.5, textAlign: 'center' },
  aboutVersion: { color: colors.textMuted, fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0E1A1E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4A2328',
    padding: 20,
    gap: 10,
  },
  dialogTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 4 },
  dialogText: { color: colors.text, fontSize: 14.5, lineHeight: 20 },
  dialogList: { gap: 2 },
  dialogMuted: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  dialogButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
});
