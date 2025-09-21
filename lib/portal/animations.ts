/* eslint-disable @typescript-eslint/no-explicit-any */
import { Variants } from 'framer-motion';

// Page transition animations
export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { 
    duration: 0.3,
    ease: [0.4, 0.0, 0.2, 1] // Custom easing curve
  }
} as const;

export const slideInFromRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
  transition: { duration: 0.4, ease: 'easeOut' }
} as const;

export const slideInFromLeft = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.4, ease: 'easeOut' }
} as const;

// Card and component animations
export const cardHover = {
  whileHover: { 
    y: -4,
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    transition: { duration: 0.2 }
  },
  whileTap: { scale: 0.98 }
} as const;

export const cardAppear: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0.0, 0.2, 1]
    }
  }
};

// List animations with stagger effect
export const listContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const listItem: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    x: -10
  },
  visible: { 
    opacity: 1, 
    y: 0,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0.0, 0.2, 1]
    }
  }
};

// Modal and dialog animations
export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
} as const;

export const modalContent = {
  initial: { 
    opacity: 0, 
    scale: 0.9,
    y: 20 
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0 
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    y: 20 
  },
  transition: { 
    duration: 0.3,
    ease: [0.4, 0.0, 0.2, 1]
  }
} as const;

// Notification animations
export const notificationSlide = {
  initial: { opacity: 0, x: 100, scale: 0.3 },
  animate: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0.0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    x: 100, 
    scale: 0.5,
    transition: {
      duration: 0.2
    }
  }
} as const;

export const toastSlideUp = {
  initial: { opacity: 0, y: 50, scale: 0.3 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0.0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    y: -50, 
    scale: 0.5,
    transition: {
      duration: 0.2
    }
  }
} as const;

// Progress and loading animations
export const progressBar: Variants = {
  initial: { scaleX: 0, originX: 0 },
  animate: (progress: number) => ({
    scaleX: progress / 100,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  })
};

export const loadingSpinner = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
} as const;

export const loadingDots: Variants = {
  start: {
    transition: {
      staggerChildren: 0.2,
      repeat: Infinity,
      repeatType: 'loop' as const
    }
  }
};

export const loadingDot: Variants = {
  start: {
    y: ['0%', '-50%', '0%'],
    transition: {
      duration: 0.6,
      ease: 'easeInOut'
    }
  }
};

// Form and input animations
export const inputFocus = {
  whileFocus: { 
    scale: 1.02,
    boxShadow: '0 0 0 3px rgba(136, 192, 192, 0.1)',
    transition: { duration: 0.2 }
  }
} as const;

export const buttonPress = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.02 },
  transition: { duration: 0.1 }
} as const;

// Success and error states
export const successCheckmark: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay: 0.2, duration: 0.3 },
      opacity: { delay: 0.2, duration: 0.1 }
    }
  }
};

export const errorShake = {
  animate: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.4
    }
  }
} as const;

// Layout animations
export const layoutId = {
  layoutId: (id: string) => id,
  transition: { 
    duration: 0.3,
    ease: [0.4, 0.0, 0.2, 1]
  }
} as const;

// Collapse/expand animations
export const collapse: Variants = {
  closed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.3 },
      opacity: { duration: 0.2 }
    }
  },
  open: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.3 },
      opacity: { duration: 0.3, delay: 0.1 }
    }
  }
};

// Tab switching animations
export const tabContent: Variants = {
  hidden: { 
    opacity: 0,
    x: -20
  },
  visible: { 
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2
    }
  }
};

// Chart and data visualization animations
export const chartBar: Variants = {
  hidden: { scaleY: 0, originY: 1 },
  visible: (i: number) => ({
    scaleY: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: 'easeOut'
    }
  })
};

export const pieSlice: Variants = {
  hidden: { 
    scale: 0,
    rotate: -90
  },
  visible: (i: number) => ({
    scale: 1,
    rotate: 0,
    transition: {
      delay: i * 0.2,
      duration: 0.6,
      ease: [0.4, 0.0, 0.2, 1]
    }
  })
};

// Utility function to create staggered animations
export const createStaggeredAnimation = (
  baseAnimation: unknown,
  staggerDelay = 0.1
) => ({
  ...(baseAnimation as Record<string, unknown>),
  transition: {
    ...(baseAnimation as any).transition,
    delay: (i: number) => i * staggerDelay
  }
});

// Reduced motion preferences
export const respectMotionPreference = (animation: unknown) => ({
  ...(animation as Record<string, unknown>),
  transition: {
    ...(animation as any).transition,
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : (animation as any).transition?.duration
  }
});

// Spring configurations
export const springConfigs = {
  gentle: { type: 'spring', stiffness: 120, damping: 14 },
  wobbly: { type: 'spring', stiffness: 180, damping: 12 },
  stiff: { type: 'spring', stiffness: 210, damping: 20 },
  slow: { type: 'spring', stiffness: 80, damping: 15 },
} as const;