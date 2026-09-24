declare function require(path:string): any;
declare namespace React { type ReactNode = any; interface Attributes { key?: any } }
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any } interface IntrinsicAttributes { key?: any } }
declare module 'react/jsx-runtime' { export const jsx:any; export const jsxs:any; export const Fragment:any; }
declare module 'react' {
  export default any;
  export type ReactNode = any;
  export function useState<T>(v:T|(()=>T)): [T,(v:T|((p:T)=>T))=>void];
  export function useEffect(fn:any,deps?:any[]):void;
  export function useMemo<T>(fn:()=>T,deps:any[]):T;
  export function useCallback<T extends (...args:any[])=>any>(fn:T,deps:any[]):T;
}
declare module 'react-native' {
  export const ActivityIndicator:any; export const Modal:any; export const Pressable:any; export const ScrollView:any; export const StyleSheet:any; export const Text:any; export const TextInput:any; export const View:any; export const Image:any; export const Alert:any; export const KeyboardAvoidingView:any; export const Platform:any; export const Linking:any;
  export function useColorScheme(): 'light'|'dark'|null;
  export function useWindowDimensions(): { width:number; height:number; scale:number; fontScale:number };
  export type TextInputProps = any; export type ColorValue = string; export type DimensionValue = number|string;
}
declare module 'react-native-safe-area-context' { export const SafeAreaView:any; export function useSafeAreaInsets(): { top:number; right:number; bottom:number; left:number }; }
declare module 'react-native-svg' { const Svg:any; export default Svg; export const Circle:any; export const Line:any; export const Path:any; export const Rect:any; export const Text:any; }
declare module 'expo-router' { export type Href = string | {pathname:string;params?:any}; export const router:{ push:(href:Href)=>void; replace:(href:any)=>void; back:()=>void }; export const Stack:any; export const Tabs:any; export function useLocalSearchParams<T=any>():T; export function useFocusEffect(fn:any):void; export function usePathname():string; }
declare module 'expo-status-bar' { export const StatusBar:any; }
declare module '@expo/vector-icons' { export const Ionicons:any; }
declare module 'zustand' { export function create<T>(fn:any):any; }
declare module 'i18n-js' { export class I18n { constructor(v:any); locale:string; defaultLocale:string; enableFallback:boolean; t(k:string,o?:any):string; } }
declare module 'expo-crypto' { export const CryptoDigestAlgorithm:any; export function randomUUID():string; export function digestStringAsync(a:any,b:string):Promise<string>; }
declare module 'expo-sqlite' { export interface SQLiteDatabase { execAsync(sql:string):Promise<void>; runAsync(sql:string,...args:any[]):Promise<{changes:number}>; getFirstAsync<T>(sql:string,...args:any[]):Promise<T|null>; getAllAsync<T>(sql:string,...args:any[]):Promise<T[]>; } export function openDatabaseAsync(name:string):Promise<SQLiteDatabase>; }
declare module 'expo-file-system/legacy' { export const documentDirectory:string; export const cacheDirectory:string; export const EncodingType:any; export function getInfoAsync(p:string):Promise<any>; export function makeDirectoryAsync(p:string,o?:any):Promise<void>; export function copyAsync(o:any):Promise<void>; export function deleteAsync(p:string,o?:any):Promise<void>; export function readAsStringAsync(p:string,o?:any):Promise<string>; export function writeAsStringAsync(p:string,d:string,o?:any):Promise<void>; }
declare module 'expo-sharing' { export function isAvailableAsync():Promise<boolean>; export function shareAsync(uri:string,o?:any):Promise<void>; }
declare module 'expo-document-picker' { export function getDocumentAsync(o?:any):Promise<any>; }
declare module 'expo-print' { export function printAsync(o:any):Promise<any>; export function printToFileAsync(o:any):Promise<{uri:string}>; }
declare module 'expo-haptics' { export const NotificationFeedbackType:any; export function selectionAsync():Promise<void>; export function notificationAsync(v:any):Promise<void>; }
declare module 'expo-image-picker' { export function launchImageLibraryAsync(o?:any):Promise<any>; }
declare module 'expo-camera' { export const CameraView:any; export function useCameraPermissions():[any,()=>Promise<any>]; }
declare module 'vitest' { export const describe:any; export const expect:any; export const it:any; }
declare module 'vitest/config' { export function defineConfig(v:any):any; }

declare module 'expo-secure-store' { export function getItemAsync(k:string):Promise<string|null>; export function setItemAsync(k:string,v:string):Promise<void>; export function deleteItemAsync(k:string):Promise<void>; }
declare module 'node:url' { export function fileURLToPath(v:any):string; export class URL { constructor(input:string, base?:any); } }

declare module 'expo-audio' { export function useAudioPlayer(source:any): { play:()=>void; seekTo:(seconds:number)=>Promise<void> }; }
