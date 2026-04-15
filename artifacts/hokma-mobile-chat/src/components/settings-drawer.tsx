import React from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Settings, Trash2, Server, Key, Mic, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SettingsDrawerProps {
  onClearChat: () => void;
}

export function SettingsDrawer({ onClearChat }: SettingsDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-card border-border">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Hokma Configuration</DrawerTitle>
            <DrawerDescription>Manage local agent settings and connections.</DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 pb-0 space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Providers</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Server className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Local Runtime</p>
                    <p className="text-xs text-muted-foreground">Connected (1ms ping)</p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Key className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">OpenAI API</p>
                    <p className="text-xs text-muted-foreground">Not configured</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-full">Setup</Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Preferences</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Continuous Voice Listening</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Local-Only Mode</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button 
                variant="destructive" 
                className="w-full justify-start gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent hover:border-destructive/30"
                onClick={onClearChat}
              >
                <Trash2 className="w-4 h-4" />
                Clear Session Memory
              </Button>
            </div>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className="rounded-full">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}