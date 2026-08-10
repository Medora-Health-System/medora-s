import "./platform.css";import {PlatformContextProvider} from "@/features/platform/PlatformContext";import {PlatformShell} from "@/features/platform/PlatformShell";
export default function Layout({children}:{children:React.ReactNode}){return <PlatformContextProvider><PlatformShell>{children}</PlatformShell></PlatformContextProvider>}
