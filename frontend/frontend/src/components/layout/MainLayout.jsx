import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import AnimatedPage from "../ui/AnimatedPage";

const MainLayout = ({
  children,
  headerTitle = "Projects",
  headerSubtitle = "Performance summary",
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebarCollapse = () => setSidebarCollapsed((prev) => !prev);

  return (
    <div className="min-h-screen flex flex-col text-[#1A2733] overflow-hidden" style={{ background: "var(--app-bg)" }}>
      <div className="flex flex-1 h-full overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={closeSidebar}
        />

        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
          <Header
            onMenuClick={toggleSidebar}
            onCollapseClick={toggleSidebarCollapse}
            isCollapsed={sidebarCollapsed}
            title={headerTitle}
            subtitle={headerSubtitle}
          />
          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ background: "var(--app-bg)" }}>
            <AnimatedPage>
              {children}
            </AnimatedPage>
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
