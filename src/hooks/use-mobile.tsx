
import * as React from "react"

const MOBILE_BREAKPOINT = 640 // Lowered from 768 to better match mobile screens

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Initial check based on window size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Run initial check
    checkMobile()
    
    // Set up resize listener for responsive changes
    window.addEventListener('resize', checkMobile)
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  return isMobile
}
