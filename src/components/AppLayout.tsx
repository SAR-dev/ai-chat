import { Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import ChatSidebar from '@/components/ChatSidebar'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Menu } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'

export default function AppLayout() {
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const toggleSidebarCollapsed = useSettingsStore((s) => s.toggleSidebarCollapsed)

  return (
    <div className="flex h-svh w-full">
      {/* Mobile: Sheet-based sidebar (always expanded -- collapsing only matters on desktop) */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="fixed top-2 left-2 z-50">
                <Menu className="h-5 w-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="w-72 p-0">
            <ChatSidebar />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar: fixed icon rail when collapsed, resizable panel when expanded */}
      <div className="hidden h-full flex-1 md:flex">
        {sidebarCollapsed ? (
          <>
            <div className="h-full w-16 shrink-0 overflow-hidden">
              <ChatSidebar collapsed onToggleCollapsed={toggleSidebarCollapsed} />
            </div>
            <div className="flex h-full min-w-0 flex-1 flex-col">
              <main className="min-h-0 min-w-0 flex-1">
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </main>
            </div>
          </>
        ) : (
          <ResizablePanelGroup orientation="horizontal" id="sidebar-layout">
            <ResizablePanel defaultSize="20" minSize="15" maxSize="30">
              <div className="h-full overflow-hidden">
                <ChatSidebar onToggleCollapsed={toggleSidebarCollapsed} />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize="80">
              <div className="flex h-full min-w-0 flex-col">
                <main className="min-h-0 min-w-0 flex-1">
                  <ErrorBoundary>
                    <Outlet />
                  </ErrorBoundary>
                </main>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      <main className="flex min-h-0 flex-1 flex-col md:hidden">
        <div className="min-h-0 min-w-0 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
