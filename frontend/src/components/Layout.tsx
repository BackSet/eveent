import { memo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { SeoHead } from "@/components/SeoHead";

export const Layout = memo(function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SeoHead noindex canonicalPath={pathname} />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
});
