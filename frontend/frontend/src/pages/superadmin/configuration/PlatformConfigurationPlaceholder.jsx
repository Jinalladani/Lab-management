import React from "react";
import { Database, FileStack } from "lucide-react";
import { MainLayout } from "../../../components/layout";
import { Badge, EmptyState, MetricCard } from "../../../components/ui";

const Workspace = ({ children }) => (
  <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-5 lg:px-6">
    <div className="space-y-6">{children}</div>
  </div>
);

const moduleCopy = {
  masterData: {
    title: "Master Data",
    subtitle: "Platform-level reference data foundation for future template workflows",
    icon: Database,
    description: "Centralized material, test, and classification data will be prepared here in Sprint 2.",
  },
  reportTemplates: {
    title: "Report Templates",
    subtitle: "Platform-wide report template governance",
    icon: FileStack,
    description: "Report template creation and release controls are planned for Sprint 2.",
  },
};

const PlatformConfigurationPlaceholder = ({ moduleKey }) => {
  const module = moduleCopy[moduleKey] || moduleCopy.masterData;
  const Icon = module.icon;

  return (
    <MainLayout headerTitle={module.title} headerSubtitle={module.subtitle}>
      <Workspace>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Module" value="Ready" caption="Route and page shell available" icon={Icon} tone="primary" />
          <MetricCard label="Backend" value="None" caption="No API or schema changes in Sprint 1" icon={Database} tone="success" />
        </section>

        <section className="rounded-[20px] border border-[#E3E7EC] bg-white p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Platform Configuration</p>
              <h2 className="mt-1 text-xl font-bold text-[#1E293B]">{module.title}</h2>
              <p className="mt-2 max-w-3xl text-sm text-[#64748B]">{module.description}</p>
            </div>
            <Badge variant="info">Coming in Sprint 2</Badge>
          </div>
          <EmptyState
            icon={Icon}
            title="Coming in Sprint 2"
            description="This page is intentionally frontend-only. No CRUD, backend integration, or business logic has been added."
          />
        </section>
      </Workspace>
    </MainLayout>
  );
};

export default PlatformConfigurationPlaceholder;
