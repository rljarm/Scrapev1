import { ProxyManager } from "@/components/scraper/proxy-manager";

export default function ProxiesPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Proxy Settings</h1>
      <div className="max-w-3xl">
        <ProxyManager />
      </div>
    </div>
  );
}
