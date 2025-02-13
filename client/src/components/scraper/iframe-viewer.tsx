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
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    const overlay = overlayRef.current;
    if (!iframe || !overlay || !url) return;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    function updateOverlay(element: HTMLElement | null) {
      if (!ctx || !overlay) return;
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);

      // Add semi-transparent fill
      ctx.fillStyle = 'rgba(79, 70, 229, 0.1)';
      ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
    }

    function handleMouseMove(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target !== hoveredElement) {
        setHoveredElement(target);
        updateOverlay(target);
      }
    }

    function handleClick(e: MouseEvent) {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const cssSelector = generateSelector(target);
      const xpath = generateXPath(target);

      onSelectElement({
        type: "css",
        value: cssSelector,
        label: target.textContent?.slice(0, 30)?.trim() || "Selected element"
      });
    }

    // Resize overlay to match iframe content
    function resizeOverlay() {
      if (!overlay || !iframe.contentDocument) return;
      const doc = iframe.contentDocument;
      overlay.width = doc.documentElement.scrollWidth;
      overlay.height = doc.documentElement.scrollHeight;
      updateOverlay(hoveredElement);
    }

    iframe.contentWindow?.document.addEventListener('mousemove', handleMouseMove);
    iframe.contentWindow?.document.addEventListener('click', handleClick);
    iframe.addEventListener('load', resizeOverlay);
    window.addEventListener('resize', resizeOverlay);

    return () => {
      iframe.contentWindow?.document.removeEventListener('mousemove', handleMouseMove);
      iframe.contentWindow?.document.removeEventListener('click', handleClick);
      iframe.removeEventListener('load', resizeOverlay);
      window.removeEventListener('resize', resizeOverlay);
    };
  }, [url, onSelectElement, hoveredElement]);

  function generateSelector(element: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current) {
      // Try ID first
      if (current.id) {
        path.unshift(`#${current.id}`);
        break;
      }

      // Then try classes
      if (current.className) {
        const classes = current.className.split(' ')
          .filter(c => c && !c.includes('hover') && !c.includes('active'))
          .join('.');
        if (classes) {
          path.unshift(`.${classes}`);
          continue;
        }
      }

      // Fallback to tag with nth-child
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) index++;
        sibling = sibling.previousElementSibling;
      }

      path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  function generateXPath(element: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;

      while (sibling) {
        if (sibling.nodeName === current.nodeName) index++;
        sibling = sibling.previousElementSibling;
      }

      const tagName = current.nodeName.toLowerCase();
      const predicates: string[] = [];

      if (current.id) {
        predicates.push(`@id='${current.id}'`);
      }

      if (index > 1) {
        predicates.push(`${index}`);
      }

      const step = predicates.length > 0 
        ? `${tagName}[${predicates.join(' and ')}]`
        : tagName;

      parts.unshift(step);
      current = current.parentElement;
    }

    return `//${parts.join('/')}`;
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

      <div className="relative" style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${100 / scale}%`,
        height: `${100 / scale}%`
      }}>
        {url && (
          <>
            <iframe
              ref={iframeRef}
              src={url}
              className="w-full h-[600px] border rounded-lg"
              sandbox="allow-same-origin allow-scripts"
            />
            <canvas
              ref={overlayRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                width: '100%',
                height: '100%'
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}