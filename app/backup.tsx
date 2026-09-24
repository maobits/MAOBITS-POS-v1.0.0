import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBackup, pickAndRestoreBackup, shareBackup } from '@/core/backup/service';
import { useSessionStore } from '@/stores/session';
import { t } from '@/core/i18n';
import { Badge, Button, Card, PageHeader, Screen, SectionTitle } from '@/shared/ui';
import { useAppTheme } from '@/core/theme/useAppTheme';

export default function Backup() {
  const th=useAppTheme(); const user=useSessionStore((s)=>s.user); const [busy,setBusy]=useState(false); const [last,setLast]=useState<string|null>(null);
  async function run(fn:()=>Promise<unknown>){if(!user)return;try{setBusy(true);const r=await fn();if(typeof r==='string')setLast(r);Alert.alert('MAOBITS POS',t('backup.success'));}catch(e){Alert.alert('MAOBITS POS',e instanceof Error?t(e.message):t('errors.unknown'));}finally{setBusy(false);}}
  return <Screen><PageHeader title={t('backup.title')} subtitle={t('premium.backup.versionedBackupWithTablesRelationshipsAndLocal')} eyebrow={t('premium.backup.milestone14DataProtection')} />
    <Card variant="primary"><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'}}><View style={{flex:1}}><Text style={{color:'#FFFFFF',fontWeight:'900',fontSize:20}}>{t('premium.backup.yourDataLivesOnThisDevice')}</Text><Text style={{color:'#C7D2FE',marginTop:6,lineHeight:20}}>{t('premium.backup.maobitsPosWorksOfflineFirstCreateRegular')}</Text></View><Ionicons name="shield-checkmark-outline" size={42} color="rgba(255,255,255,.28)"/></View></Card>
    <View style={{flexDirection:'row',gap:12,flexWrap:'wrap'}}><Card style={{flex:1,minWidth:220}}><View style={{width:52,height:52,borderRadius:17,backgroundColor:th.colors.primarySoft,alignItems:'center',justifyContent:'center'}}><Ionicons name="download-outline" size={25} color={th.colors.primary}/></View><SectionTitle title={t('premium.backup.createBackup')} subtitle={t('premium.backup.databasePersistentMedia')}/><Button fullWidth icon="share-outline" label={t('backup.export')} disabled={busy} onPress={()=>void run(()=>shareBackup(user!.id))}/></Card><Card style={{flex:1,minWidth:220}}><View style={{width:52,height:52,borderRadius:17,backgroundColor:th.colors.dangerSoft,alignItems:'center',justifyContent:'center'}}><Ionicons name="refresh-outline" size={25} color={th.colors.danger}/></View><SectionTitle title={t('premium.backup.restoreBackup')} subtitle={t('premium.backup.validatesFormatAndVersionBeforeReplacingData')}/><Button fullWidth variant="danger" icon="cloud-upload-outline" label={t('backup.restore')} disabled={busy} onPress={()=>void run(()=>pickAndRestoreBackup(user!.id))}/></Card></View>
    <Card variant="soft"><Badge label={t('premium.backup.maobitsPosBackupV1')} tone="info" icon="document-outline"/><Text style={{color:th.colors.muted,lineHeight:19}}>{t('backup.warning')}</Text>{last?<Text style={{color:th.colors.subtle,fontSize:11}} numberOfLines={2}>{last}</Text>:null}</Card>
  </Screen>;
}
