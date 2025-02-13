import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export function ProxyManager() {
  const { toast } = useToast();
  const [proxyType, setProxyType] = useState<'http' | 'socks5'>('http');
  const [isUploading, setIsUploading] = useState(false);
  const [proxyText, setProxyText] = useState('');

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
        type: proxyType,
      });

      toast({
        title: "Proxies added successfully",
        description: `Added ${proxies.length} proxies`,
      });

      setProxyText('');
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
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Proxy Type</Label>
          <Select
            value={proxyType}
            onValueChange={(value: 'http' | 'socks5') => setProxyType(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="http">HTTP/HTTPS</SelectItem>
              <SelectItem value="socks5">SOCKS5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Upload Proxy List (.txt)</Label>
          <Input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
          />
        </div>

        <div className="space-y-2">
          <Label>Paste Proxy List (IP:Port:Username:Password format)</Label>
          <Textarea
            value={proxyText}
            onChange={(e) => setProxyText(e.target.value)}
            placeholder="127.0.0.1:8080:user:pass"
            className="min-h-[200px]"
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
          Add Proxies
        </Button>
      </CardContent>
    </Card>
  );
}
