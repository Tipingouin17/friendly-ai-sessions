
import React from "react";
import { useSessionPageState } from "@/hooks/useSessionPageState";
import { useSessionPageEffects } from "@/hooks/useSessionPageEffects";
import SessionContent from "@/components/session/SessionContent";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Session = () => {
  // Get session state from our custom hook
  const {
    isLoading,
    setIsLoading,
    hasInitializedProvider,
    sessionStarted,
    handleError,
    handleSessionFull,
    retryConnection,
    handleProviderInitialized,
    stateRef,
    isOnAdminPath
  } = useSessionPageState();
  
  // Check if we're on mobile
  const isMobile = useIsMobile();
  
  // Set up session page effects
  const { sessionMountedRef } = useSessionPageEffects({
    isLoading,
    hasInitializedProvider,
    setIsLoading,
    retryConnection,
    isAdmin: stateRef.current.isAdmin,
    isOnAdminPath
  });

  // Render the mobile navigation menu
  const renderMobileNavMenu = () => {
    if (!isMobile) return null;
    
    return (
      <div className="fixed top-0 left-0 right-0 z-50 p-2 bg-white border-b border-gray-200">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className="flex items-center gap-2">
                <Menu className="h-5 w-5" />
                <span>Menu</span>
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[200px] gap-2 p-2">
                  <li>
                    <NavigationMenuLink asChild>
                      <a href="/" className="block p-2 hover:bg-slate-100 rounded-md">
                        Home
                      </a>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <a href="/my-facilitators" className="block p-2 hover:bg-slate-100 rounded-md">
                        My Facilitators
                      </a>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <a href="/pricing" className="block p-2 hover:bg-slate-100 rounded-md">
                        Pricing
                      </a>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <a href="/profile" className="block p-2 hover:bg-slate-100 rounded-md">
                        Profile
                      </a>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    );
  };

  // Render the session page with SessionContent component
  return (
    <>
      {renderMobileNavMenu()}
      <div className={isMobile ? "pt-14" : ""}>
        <SessionContent
          isLoading={isLoading}
          hasInitializedProvider={hasInitializedProvider}
          sessionStarted={sessionStarted}
          error={stateRef.current.error}
          noSessionFound={stateRef.current.noSessionFound}
          connectionAttempts={stateRef.current.connectionAttempts}
          isAdmin={stateRef.current.isAdmin}
          sessionMountedRef={sessionMountedRef}
          handleProviderInitialized={handleProviderInitialized}
          setIsLoading={setIsLoading}
          handleError={handleError}
          handleSessionFull={handleSessionFull}
          retryConnection={retryConnection}
          forceAdmin={isOnAdminPath}
        />
      </div>
    </>
  );
};

export default Session;
