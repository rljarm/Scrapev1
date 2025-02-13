import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  url: string;
  onSelectElement: (element: {type: "css" | "xpath", value: string, label: string}) => void;
}

export default function IframeViewer({ url, onSelectElement }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !url) return;

    function handleClick(e: MouseEvent) {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const cssSelector = generateSelector(target);
      const xpath = generateXPath(target);
      
      onSelectElement({
        type: "css",
        value: cssSelector,
        label: target.textContent?.slice(0, 30) || "Selected element"
      });
    }

    iframe.contentWindow?.document.addEventListener('click', handleClick);
    return () => {
      iframe.contentWindow?.document.removeEventListener('click', handleClick);
    };
  }, [url, onSelectElement]);

  function generateSelector(element: HTMLElement): string {
    // Simple implementation - in reality would be more robust
    return element.id ? `#${element.id}` : element.className ? `.${element.className.split(' ')[0]}` : element.tagName.toLowerCase();
  }

  function generateXPath(element: HTMLElement): string {
    // Simple implementation - in reality would be more robust
    if (element.id) return `//*[@id="${element.id}"]`;
    return element.tagName.toLowerCase();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScale(s => Math.max(0.25, s - 0.25))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScale(s => Math.min(2, s + 0.25))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{url}</span>
        </div>
      </div>

      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${100 / scale}%`,
        height: `${100 / scale}%`
      }}>
        {url && (
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-[600px] border rounded-lg"
            sandbox="allow-same-origin"
          />
        )}
      </div>
    </div>
  );
}
