import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Globe, X } from "lucide-react";

interface Props {
  url: string;
  onUrlChange: (url: string) => void;
  selectedElements: Array<{type: "css" | "xpath", value: string, label: string}>;
  onRemoveElement: (index: number) => void;
}

export default function SelectorTools({ url, onUrlChange, selectedElements, onRemoveElement }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Target URL</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter website URL"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
          />
          <Button variant="outline" size="icon">
            <Globe className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Selected Elements</h3>
          {selectedElements.map((el, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
            >
              <div className="flex-1 truncate">
                <span className="font-mono text-xs bg-primary/10 px-1 rounded">
                  {el.type}
                </span>
                <span className="ml-2">{el.value}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onRemoveElement(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {selectedElements.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Click elements in the preview to select them
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
