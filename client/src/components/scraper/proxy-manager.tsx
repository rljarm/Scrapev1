import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus } from "lucide-react";

export function ProxyManager() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [proxyText, setProxyText] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setProxyText(text);
    } catch (error) {
      toast({
        title: "Error reading file",
        description: "Could not read the proxy list file",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!proxyText.trim()) {
      toast({
        title: "No proxies provided",
        description: "Please enter proxies or upload a file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const proxies = proxyText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      await apiRequest('POST', '/api/proxies/bulk', {
        proxies,
        type: 'http',
      });

      toast({
        title: "Proxies added successfully",
        description: `Added ${proxies.length} proxies`,
      });

      setProxyText('');
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Failed to add proxies",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proxy Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Proxies
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Proxies</DialogTitle>
              <DialogDescription>
                Enter your proxies in IP:Port:Username:Password format, one per line
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Upload Proxy List (.txt)</Label>
                <Input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                />
              </div>
              <div className="space-y-2">
                <Label>Paste Proxy List</Label>
                <Textarea
                  value={proxyText}
                  onChange={(e) => setProxyText(e.target.value)}
                  placeholder="127.0.0.1:8080:user:pass"
                  className="min-h-[300px]"
                />
              </div>
              <Button 
                onClick={handleSubmit} 
                className="w-full"
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Proxies
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="w-full">
          Configure Settings
        </Button>
      </CardContent>
    </Card>
  );
}