import React from "react";
import {
  Bot, Building2, Database, HardDrive, Mail, Paintbrush,
  PlugZap, Settings, ShieldCheck,
} from "lucide-react";
import { MainLayout } from "../../../components/layout";
import { Badge, MetricCard } from "../../../components/ui";

const Workspace = ({ children }) => (
  <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-5 lg:px-6">
    <div className="space-y-6">{children}</div>
  </div>
);

const settings = [
  { title: "Platform", description: "Available in future sprint", icon: Building2 },
  { title: "Branding", description: "Available in future sprint", icon: Paintbrush },
  { title: "Email", description: "Available in future sprint", icon: Mail },
  { title: "Storage", description: "Available in future sprint", icon: HardDrive },
  { title: "Security", description: "Available in future sprint", icon: ShieldCheck },
  { title: "Integrations", description: "Available in future sprint", icon: PlugZap },
  { title: "AI", description: "Available in future sprint", icon: Bot },
];

const SuperAdminSettings = () => (
  <MainLayout headerTitle="Settings" headerSubtitle="Frontend-only platform settings categories">
    <Workspace>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Categories" value={settings.length} caption="Prepared settings sections" icon={Settings} tone="primary" />
        <MetricCard label="Backend Changes" value="0" caption="No APIs, schema, or migrations" icon={Database} tone="success" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {settings.map((item) => (
          <article key={item.title} className="rounded-[20px] border border-[#E3E7EC] bg-white p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F5F7] text-[#23395B]">
              <item.icon size={22} />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <h2 className="text-lg font-bold text-[#1E293B]">{item.title}</h2>
              <Badge variant="neutral">Future</Badge>
            </div>
            <p className="mt-2 text-sm text-[#64748B]">{item.description}</p>
          </article>
        ))}
      </section>
    </Workspace>
  </MainLayout>
);

export default SuperAdminSettings;
