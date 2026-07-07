import { Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import ChatSidebar from '@/components/ChatSidebar'
import ErrorBoundary from '@/components/ErrorBoundary'
import { List } from '@phosphor-icons/react'

export default function AppLayout() {
  return (
    <div className="flex h-svh w-full">
      {/* Mobile: Sheet-based sidebar */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="fixed top-2 left-2 z-50">
                <List className="h-5 w-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="w-72 p-0">
            <ChatSidebar />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Resizable sidebar */}
      <div className="hidden h-full flex-1 md:flex">
        <ResizablePanelGroup orientation="horizontal" id="sidebar-layout">
          <ResizablePanel defaultSize="20" minSize="15" maxSize="30">
            <div className="h-full overflow-hidden">
              <ChatSidebar />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="80">
            <div className="flex h-full flex-col">
              <main className="min-h-0 flex-1">
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </main>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: Content area */}
      <main className="flex flex-1 flex-col md:hidden">
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
