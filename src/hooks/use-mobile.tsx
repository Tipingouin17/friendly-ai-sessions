
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    try {
      // Add event listener safely
      if (mql.addEventListener) {
        mql.addEventListener("change", onChange)
      } else if (mql.addListener) {
        // Fallback for older browsers
        mql.addListener(onChange)
      }
      
      // Initial check
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    } catch (e) {
      console.error("Error in mobile detection hook:", e);
    }
    
    // Return a proper cleanup function
    return () => {
      try {
        if (mql.removeEventListener) {
          mql.removeEventListener("change", onChange)
        } else if (mql.removeListener) {
          // Only call removeListener if it exists
          mql.removeListener(onChange)
        }
      } catch (e) {
        console.error("Error cleaning up mobile detection hook:", e);
      }
    }
  }, [])

  return isMobile
}
