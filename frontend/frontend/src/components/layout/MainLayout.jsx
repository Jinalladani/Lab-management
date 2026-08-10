import React, { useState } from "react";
import { motion } from "framer-motion";
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
    <div className="h-screen text-[#1A2733] overflow-hidden" style={{ background: "var(--app-bg)" }}>
      <div className="flex h-full overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={closeSidebar}
          onToggleCollapse={toggleSidebarCollapse}
        />

        <div
          className={[
            "flex h-full min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-[250ms] ease-in-out",
            sidebarCollapsed ? "md:ml-[4.75rem]" : "md:ml-[17rem]",
          ].join(" ")}
        >
          <Header
            onMenuClick={toggleSidebar}
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
