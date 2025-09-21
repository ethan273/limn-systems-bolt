// Accessibility audit tool for runtime checking
export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info'
  category: 'color-contrast' | 'focus-management' | 'semantic-html' | 'aria' | 'keyboard' | 'images'
  element?: HTMLElement
  selector?: string
  message: string
  recommendation: string
  wcagCriterion?: string
  severity: 1 | 2 | 3 // 1 = critical, 2 = important, 3 = minor
}

export class AccessibilityAuditor {
  private issues: AccessibilityIssue[] = []

  audit(container: HTMLElement = document.body): AccessibilityIssue[] {
    this.issues = []
    
    // Run all audit checks
    this.checkColorContrast(container)
    this.checkFocusManagement(container)
    this.checkSemanticHTML(container)
    this.checkARIAUsage(container)
    this.checkKeyboardAccessibility(container)
    this.checkImages(container)
    this.checkHeadingHierarchy(container)
    this.checkForms(container)
    this.checkLinks(container)
    this.checkLandmarks(container)

    return this.issues
  }

  private addIssue(issue: Omit<AccessibilityIssue, 'severity'> & { severity?: number }) {
    this.issues.push({
      ...issue,
      severity: (issue.severity || 2) as 1 | 2 | 3
    })
  }

  private checkColorContrast(container: HTMLElement) {
    const textElements = container.querySelectorAll('*')
    
    textElements.forEach(element => {
      const htmlElement = element as HTMLElement
      const styles = window.getComputedStyle(htmlElement)
      
      // Skip elements with no visible text
      if (!htmlElement.textContent?.trim()) return
      
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      const fontSize = parseFloat(styles.fontSize)
      
      // Simple contrast check (in production, you'd want a more robust implementation)
      if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && styles.fontWeight === 'bold')
        
        // This is a simplified check - in practice you'd convert colors to RGB and calculate actual contrast
        if (this.hasLowContrast()) {
          this.addIssue({
            type: 'error',
            category: 'color-contrast',
            element: htmlElement,
            message: 'Text does not meet minimum color contrast requirements',
            recommendation: `Ensure text has a contrast ratio of at least ${isLargeText ? '3:1' : '4.5:1'} with its background`,
            wcagCriterion: '1.4.3 Contrast (Minimum)',
            severity: 1
          })
        }
      }
    })
  }

  private hasLowContrast(): boolean {
    // Simplified contrast check - in practice, you'd implement proper contrast calculation
    // This is just a placeholder to demonstrate the concept
    return false
  }

  private checkFocusManagement(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"]), [contenteditable]'
    )

    focusableElements.forEach(element => {
      const htmlElement = element as HTMLElement
      const styles = window.getComputedStyle(htmlElement)
      
      // Check for visible focus indicator
      if (styles.outline === 'none' && !this.hasCustomFocusStyle()) {
        this.addIssue({
          type: 'warning',
          category: 'focus-management',
          element: htmlElement,
          message: 'Interactive element lacks visible focus indicator',
          recommendation: 'Ensure all interactive elements have a visible focus indicator for keyboard users',
          wcagCriterion: '2.4.7 Focus Visible',
          severity: 2
        })
      }

      // Check for logical tab order
      const tabIndex = htmlElement.getAttribute('tabindex')
      if (tabIndex && parseInt(tabIndex) > 0) {
        this.addIssue({
          type: 'warning',
          category: 'focus-management',
          element: htmlElement,
          message: 'Positive tabindex value disrupts natural tab order',
          recommendation: 'Use tabindex="0" or rely on natural document order instead of positive tabindex values',
          wcagCriterion: '2.4.3 Focus Order',
          severity: 2
        })
      }
    })
  }

  private hasCustomFocusStyle(): boolean {
    // Check if element has custom focus styles
    // This is a simplified check - in practice, you'd need to inspect CSS rules
    return false
  }

  private checkSemanticHTML(container: HTMLElement) {
    // Check for proper heading hierarchy
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    let expectedLevel = 1
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.substring(1))
      
      if (level > expectedLevel + 1) {
        this.addIssue({
          type: 'error',
          category: 'semantic-html',
          element: heading as HTMLElement,
          message: `Heading level skipped from h${expectedLevel} to h${level}`,
          recommendation: 'Use heading levels in sequential order without skipping levels',
          wcagCriterion: '1.3.1 Info and Relationships',
          severity: 2
        })
      }
      
      expectedLevel = Math.max(expectedLevel, level)
    })

    // Check for generic div/span usage where semantic elements would be better
    const genericContainers = container.querySelectorAll('div, span')
    genericContainers.forEach(element => {
      const htmlElement = element as HTMLElement
      
      // Check if this looks like it should be a button
      if (htmlElement.onclick || htmlElement.getAttribute('role') === 'button') {
        this.addIssue({
          type: 'warning',
          category: 'semantic-html',
          element: htmlElement,
          message: 'Generic element used for interactive functionality',
          recommendation: 'Use semantic HTML elements like <button> instead of div/span with click handlers',
          wcagCriterion: '4.1.2 Name, Role, Value',
          severity: 2
        })
      }
    })
  }

  private checkARIAUsage(container: HTMLElement) {
    const elementsWithAria = container.querySelectorAll('[aria-*]')
    
    elementsWithAria.forEach(element => {
      const htmlElement = element as HTMLElement
      
      // Check for aria-labelledby pointing to non-existent elements
      const labelledBy = htmlElement.getAttribute('aria-labelledby')
      if (labelledBy) {
        const labelElement = document.getElementById(labelledBy)
        if (!labelElement) {
          this.addIssue({
            type: 'error',
            category: 'aria',
            element: htmlElement,
            message: `aria-labelledby references non-existent element "${labelledBy}"`,
            recommendation: 'Ensure aria-labelledby references an existing element ID',
            wcagCriterion: '4.1.2 Name, Role, Value',
            severity: 1
          })
        }
      }

      // Check for aria-describedby pointing to non-existent elements
      const describedBy = htmlElement.getAttribute('aria-describedby')
      if (describedBy) {
        describedBy.split(' ').forEach(id => {
          const descElement = document.getElementById(id.trim())
          if (!descElement) {
            this.addIssue({
              type: 'error',
              category: 'aria',
              element: htmlElement,
              message: `aria-describedby references non-existent element "${id}"`,
              recommendation: 'Ensure aria-describedby references existing element IDs',
              wcagCriterion: '4.1.2 Name, Role, Value',
              severity: 1
            })
          }
        })
      }

      // Check for invalid ARIA attributes
      const ariaAttributes = Array.from(htmlElement.attributes).filter(
        attr => attr.name.startsWith('aria-')
      )
      
      ariaAttributes.forEach(attr => {
        if (!this.isValidAriaAttribute(attr.name)) {
          this.addIssue({
            type: 'error',
            category: 'aria',
            element: htmlElement,
            message: `Invalid ARIA attribute "${attr.name}"`,
            recommendation: 'Use only valid ARIA attributes from the specification',
            wcagCriterion: '4.1.2 Name, Role, Value',
            severity: 1
          })
        }
      })
    })
  }

  private isValidAriaAttribute(attrName: string): boolean {
    const validAriaAttributes = [
      'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-expanded',
      'aria-hidden', 'aria-live', 'aria-atomic', 'aria-busy', 'aria-controls',
      'aria-current', 'aria-disabled', 'aria-haspopup', 'aria-invalid',
      'aria-pressed', 'aria-readonly', 'aria-required', 'aria-selected',
      'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
      'aria-valuetext', 'aria-owns', 'aria-activedescendant', 'aria-autocomplete',
      'aria-checked', 'aria-colspan', 'aria-flowto', 'aria-grabbed',
      'aria-level', 'aria-multiline', 'aria-multiselectable', 'aria-orientation',
      'aria-placeholder', 'aria-posinset', 'aria-rowcount', 'aria-rowindex',
      'aria-rowspan', 'aria-setsize', 'aria-colcount', 'aria-colindex'
    ]
    
    return validAriaAttributes.includes(attrName)
  }

  private checkKeyboardAccessibility(container: HTMLElement) {
    const interactiveElements = container.querySelectorAll(
      'a, button, input, textarea, select, [role="button"], [role="link"], [role="menuitem"]'
    )

    interactiveElements.forEach(element => {
      const htmlElement = element as HTMLElement
      
      // Check if interactive elements are keyboard accessible
      if (htmlElement.tabIndex === -1 && !htmlElement.hasAttribute('aria-hidden')) {
        this.addIssue({
          type: 'error',
          category: 'keyboard',
          element: htmlElement,
          message: 'Interactive element is not keyboard accessible',
          recommendation: 'Ensure interactive elements can be reached and activated using the keyboard',
          wcagCriterion: '2.1.1 Keyboard',
          severity: 1
        })
      }
    })

    // Check for keyboard traps
    const elementsWithTabindex = container.querySelectorAll('[tabindex]')
    elementsWithTabindex.forEach(element => {
      const tabindex = parseInt(element.getAttribute('tabindex') || '0')
      if (tabindex > 0 && tabindex > 100) { // Arbitrary high number indicating potential trap
        this.addIssue({
          type: 'warning',
          category: 'keyboard',
          element: element as HTMLElement,
          message: 'Potential keyboard trap detected',
          recommendation: 'Ensure users can navigate away from this element using standard keyboard commands',
          wcagCriterion: '2.1.2 No Keyboard Trap',
          severity: 1
        })
      }
    })
  }

  private checkImages(container: HTMLElement) {
    const images = container.querySelectorAll('img')
    
    images.forEach(img => {
      // Check for alt text
      const alt = img.getAttribute('alt')
      const role = img.getAttribute('role')
      
      if (alt === null && role !== 'presentation' && !img.hasAttribute('aria-hidden')) {
        this.addIssue({
          type: 'error',
          category: 'images',
          element: img,
          message: 'Image missing alt attribute',
          recommendation: 'Provide meaningful alt text for images, or use alt="" for decorative images',
          wcagCriterion: '1.1.1 Non-text Content',
          severity: 1
        })
      }

      // Check for overly long alt text
      if (alt && alt.length > 150) {
        this.addIssue({
          type: 'warning',
          category: 'images',
          element: img,
          message: 'Alt text is very long',
          recommendation: 'Keep alt text concise (under 150 characters). Consider using aria-describedby for longer descriptions',
          wcagCriterion: '1.1.1 Non-text Content',
          severity: 3
        })
      }
    })
  }

  private checkHeadingHierarchy(container: HTMLElement) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    
    if (headings.length === 0) {
      this.addIssue({
        type: 'warning',
        category: 'semantic-html',
        message: 'No headings found on page',
        recommendation: 'Use headings to structure content hierarchically',
        wcagCriterion: '1.3.1 Info and Relationships',
        severity: 2
      })
      return
    }

    // Check for multiple h1 elements
    const h1Elements = container.querySelectorAll('h1')
    if (h1Elements.length > 1) {
      this.addIssue({
        type: 'warning',
        category: 'semantic-html',
        message: 'Multiple h1 elements found',
        recommendation: 'Use only one h1 element per page or section for better document structure',
        wcagCriterion: '1.3.1 Info and Relationships',
        severity: 2
      })
    }

    // Check for empty headings
    headings.forEach(heading => {
      if (!heading.textContent?.trim()) {
        this.addIssue({
          type: 'error',
          category: 'semantic-html',
          element: heading as HTMLElement,
          message: 'Empty heading element',
          recommendation: 'Headings should contain descriptive text',
          wcagCriterion: '1.3.1 Info and Relationships',
          severity: 2
        })
      }
    })
  }

  private checkForms(container: HTMLElement) {
    const formControls = container.querySelectorAll('input, textarea, select')
    
    formControls.forEach(control => {
      const htmlControl = control as HTMLFormElement
      const type = htmlControl.getAttribute('type')
      const id = htmlControl.id
      const name = htmlControl.getAttribute('name')
      
      // Check for associated labels
      let hasLabel = false
      
      if (id) {
        const label = container.querySelector(`label[for="${id}"]`)
        if (label) hasLabel = true
      }
      
      const ariaLabel = htmlControl.getAttribute('aria-label')
      const ariaLabelledby = htmlControl.getAttribute('aria-labelledby')
      
      if (ariaLabel || ariaLabelledby) hasLabel = true
      
      if (!hasLabel && type !== 'hidden' && type !== 'submit' && type !== 'button') {
        this.addIssue({
          type: 'error',
          category: 'aria',
          element: htmlControl,
          message: 'Form control missing accessible label',
          recommendation: 'Associate form controls with labels using <label for=""> or aria-label/aria-labelledby',
          wcagCriterion: '1.3.1 Info and Relationships',
          severity: 1
        })
      }

      // Check for fieldsets in radio/checkbox groups
      if (type === 'radio' || type === 'checkbox') {
        const fieldset = htmlControl.closest('fieldset')
        const similarControls = container.querySelectorAll(`input[name="${name}"]`)
        
        if (similarControls.length > 1 && !fieldset) {
          this.addIssue({
            type: 'warning',
            category: 'aria',
            element: htmlControl,
            message: 'Radio/checkbox group should be wrapped in fieldset with legend',
            recommendation: 'Group related form controls using fieldset and legend elements',
            wcagCriterion: '1.3.1 Info and Relationships',
            severity: 2
          })
        }
      }
    })
  }

  private checkLinks(container: HTMLElement) {
    const links = container.querySelectorAll('a')
    
    links.forEach(link => {
      // Check for empty links
      const linkText = link.textContent?.trim()
      const ariaLabel = link.getAttribute('aria-label')
      const ariaLabelledby = link.getAttribute('aria-labelledby')
      
      if (!linkText && !ariaLabel && !ariaLabelledby) {
        this.addIssue({
          type: 'error',
          category: 'semantic-html',
          element: link,
          message: 'Link has no accessible text',
          recommendation: 'Provide descriptive text for links using text content, aria-label, or aria-labelledby',
          wcagCriterion: '2.4.4 Link Purpose (In Context)',
          severity: 1
        })
      }

      // Check for generic link text
      if (linkText && ['click here', 'read more', 'more', 'here'].includes(linkText.toLowerCase())) {
        this.addIssue({
          type: 'warning',
          category: 'semantic-html',
          element: link,
          message: 'Link text is not descriptive',
          recommendation: 'Use descriptive link text that explains where the link goes or what it does',
          wcagCriterion: '2.4.4 Link Purpose (In Context)',
          severity: 2
        })
      }

      // Check for links without href
      if (!link.getAttribute('href') && link.getAttribute('role') !== 'button') {
        this.addIssue({
          type: 'warning',
          category: 'semantic-html',
          element: link,
          message: 'Link element without href attribute',
          recommendation: 'Use button element for interactive elements that don\'t navigate',
          wcagCriterion: '4.1.2 Name, Role, Value',
          severity: 2
        })
      }
    })
  }

  private checkLandmarks(container: HTMLElement) {
    // Check for main landmark
    const mainElements = container.querySelectorAll('main, [role="main"]')
    if (mainElements.length === 0) {
      this.addIssue({
        type: 'warning',
        category: 'semantic-html',
        message: 'No main landmark found',
        recommendation: 'Use <main> element or role="main" to identify the main content area',
        wcagCriterion: '1.3.6 Identify Purpose',
        severity: 2
      })
    } else if (mainElements.length > 1) {
      this.addIssue({
        type: 'error',
        category: 'semantic-html',
        message: 'Multiple main landmarks found',
        recommendation: 'Use only one main landmark per page',
        wcagCriterion: '1.3.6 Identify Purpose',
        severity: 2
      })
    }

    // Check for navigation landmarks
    const navElements = container.querySelectorAll('nav, [role="navigation"]')
    navElements.forEach(nav => {
      const ariaLabel = nav.getAttribute('aria-label')
      const ariaLabelledby = nav.getAttribute('aria-labelledby')
      
      if (navElements.length > 1 && !ariaLabel && !ariaLabelledby) {
        this.addIssue({
          type: 'warning',
          category: 'semantic-html',
          element: nav as HTMLElement,
          message: 'Navigation landmark needs accessible name when multiple navigation areas exist',
          recommendation: 'Use aria-label or aria-labelledby to distinguish between multiple navigation areas',
          wcagCriterion: '1.3.6 Identify Purpose',
          severity: 2
        })
      }
    })
  }

  // Generate report
  generateReport(): string {
    const errorCount = this.issues.filter(issue => issue.type === 'error').length
    const warningCount = this.issues.filter(issue => issue.type === 'warning').length
    const infoCount = this.issues.filter(issue => issue.type === 'info').length

    let report = `Accessibility Audit Report\n`
    report += `============================\n\n`
    report += `Issues found: ${this.issues.length}\n`
    report += `- Errors: ${errorCount}\n`
    report += `- Warnings: ${warningCount}\n`
    report += `- Info: ${infoCount}\n\n`

    if (this.issues.length === 0) {
      report += `No accessibility issues found!\n`
      return report
    }

    // Group by category
    const categories = ['color-contrast', 'focus-management', 'semantic-html', 'aria', 'keyboard', 'images'] as const
    
    categories.forEach(category => {
      const categoryIssues = this.issues.filter(issue => issue.category === category)
      if (categoryIssues.length === 0) return

      report += `${category.toUpperCase().replace('-', ' ')}\n`
      report += `${'-'.repeat(category.length + 1)}\n`
      
      categoryIssues.forEach((issue, index) => {
        report += `${index + 1}. [${issue.type.toUpperCase()}] ${issue.message}\n`
        report += `   Recommendation: ${issue.recommendation}\n`
        if (issue.wcagCriterion) {
          report += `   WCAG: ${issue.wcagCriterion}\n`
        }
        if (issue.selector) {
          report += `   Element: ${issue.selector}\n`
        }
        report += `\n`
      })
    })

    return report
  }
}

// Create global auditor instance
export const accessibilityAuditor = new AccessibilityAuditor()

// Development helper to run audit on demand
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as unknown as Record<string, unknown>).__runA11yAudit = () => {
    const issues = accessibilityAuditor.audit()
    console.log(accessibilityAuditor.generateReport())
    return issues
  }
}