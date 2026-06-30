import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

const MainLayout = ({
  children,
  headerTitle = "Projects",
  headerSubtitle = "Performance summary",
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <div className="flex flex-1 h-full overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
          <Header
            onMenuClick={toggleSidebar}
            title={headerTitle}
            subtitle={headerSubtitle}
          />
          <main className="flex-1 min-h-0 overflow-y-auto bg-white">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;