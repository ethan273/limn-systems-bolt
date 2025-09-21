'use client';

import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import {
  pageTransition,
  cardHover,
  cardAppear,
  listContainer,
  listItem,
  modalOverlay,
  modalContent,
  notificationSlide,
  buttonPress,
  inputFocus,
  collapse,
  tabContent,
  springConfigs
} from '@/lib/portal/animations';

// Page wrapper with smooth transitions
interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedPage({ children, className }: AnimatedPageProps) {
  return (
    <motion.div
      className={className}
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
      transition={pageTransition.transition}
    >
      {children}
    </motion.div>
  );
}

// Card component with hover effects
interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  enableHover?: boolean;
  enableAppear?: boolean;
}

export function AnimatedCard({ 
  children, 
  enableHover = true, 
  enableAppear = true,
  className,
  ...props 
}: AnimatedCardProps) {
  return (
    <motion.div
      className={className}
      variants={enableAppear ? cardAppear : undefined}
      initial={enableAppear ? 'hidden' : undefined}
      animate={enableAppear ? 'visible' : undefined}
      whileHover={enableHover ? cardHover.whileHover : undefined}
      whileTap={enableHover ? cardHover.whileTap : undefined}
      layout
      {...props}
    >
      {children}
    </motion.div>
  );
}

// List with staggered item animations
interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      className={className}
      variants={listContainer}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({ 
  children, 
  className,
  ...props 
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={className}
      variants={listItem}
      layout
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Modal with backdrop and content animations
interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function AnimatedModal({ 
  isOpen, 
  onClose, 
  children, 
  className 
}: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            {...modalOverlay}
            onClick={onClose}
          />
          <motion.div
            className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${className || ''}`}
            {...modalContent}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Notification/toast component
interface AnimatedNotificationProps {
  isVisible: boolean;
  children: ReactNode;
  className?: string;
}

export function AnimatedNotification({ 
  isVisible, 
  children, 
  className 
}: AnimatedNotificationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={className}
          {...notificationSlide}
          layout
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Button with press animation
interface AnimatedButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function AnimatedButton({ 
  children, 
  variant = 'primary',
  className,
  ...props 
}: AnimatedButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };

  return (
    <motion.button
      className={`${baseClasses} ${variantClasses[variant]} ${className || ''}`}
      whileTap={buttonPress.whileTap}
      whileHover={buttonPress.whileHover}
      transition={buttonPress.transition}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Input with focus animation
interface AnimatedInputProps extends HTMLMotionProps<'input'> {
  label?: string;
}

export function AnimatedInput({ 
  label, 
  className,
  ...props 
}: AnimatedInputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <motion.input
        className={`block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className || ''}`}
        whileFocus={inputFocus.whileFocus}
        {...props}
      />
    </div>
  );
}

// Collapsible content
interface AnimatedCollapseProps {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}

export function AnimatedCollapse({ 
  isOpen, 
  children, 
  className 
}: AnimatedCollapseProps) {
  return (
    <motion.div
      variants={collapse}
      initial="closed"
      animate={isOpen ? "open" : "closed"}
      className={className}
      style={{ overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  );
}

// Tab content switcher
interface AnimatedTabContentProps {
  activeTab: string;
  tabId: string;
  children: ReactNode;
  className?: string;
}

export function AnimatedTabContent({ 
  activeTab, 
  tabId, 
  children, 
  className 
}: AnimatedTabContentProps) {
  return (
    <AnimatePresence mode="wait">
      {activeTab === tabId && (
        <motion.div
          key={tabId}
          variants={tabContent}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Progress bar with smooth animation
interface AnimatedProgressProps {
  progress: number;
  className?: string;
  showPercentage?: boolean;
}

export function AnimatedProgress({ 
  progress, 
  className,
  showPercentage = false 
}: AnimatedProgressProps) {
  return (
    <div className={`space-y-1 ${className || ''}`}>
      {showPercentage && (
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-blue-500 rounded-full"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Loading spinner
interface AnimatedSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AnimatedSpinner({ 
  size = 'md', 
  className 
}: AnimatedSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} border-2 border-gray-300 border-t-blue-600 rounded-full ${className || ''}`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

// Floating action button with spring animation
interface AnimatedFABProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
  isVisible?: boolean;
}

export function AnimatedFAB({ 
  children, 
  isVisible = true, 
  className,
  ...props 
}: AnimatedFABProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          className={`fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-50 ${className || ''}`}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={springConfigs.wobbly}
          {...props}
        >
          {children}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// Staggered grid container
interface AnimatedGridProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function AnimatedGrid({ 
  children, 
  className, 
  staggerDelay = 0.1 
}: AnimatedGridProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedGridItem({ 
  children, 
  className,
  ...props 
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.8 },
        visible: { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: {
            duration: 0.5,
            ease: [0.4, 0.0, 0.2, 1],
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}