import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Database, LogOut, Settings } from "lucide-react";

export function Nav() {
  const { logoutMutation } = useAuth();

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 flex h-14 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="link">Scraper</Button>
          </Link>
          <Link href="/proxies">
            <Button variant="link">
              <Database className="w-4 h-4 mr-2" />
              Proxy Settings
            </Button>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
