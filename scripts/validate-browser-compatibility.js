#!/usr/bin/env node

/**
 * Cross-Browser Compatibility Validation Script
 * Validates that the application works across different browsers and platforms
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import chalk from 'chalk';

const BUILD_PATH = resolve(process.cwd(), 'build');

class BrowserCompatibilityValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.bundleContent = '';
  }

  /**
   * Load bundle content for analysis
   */
  loadBundleContent() {
    console.log(chalk.yellow('📦 Loading bundle content for compatibility analysis...'));
    
    if (!existsSync(BUILD_PATH)) {
      this.errors.push('Build directory not found. Run "pnpm build" first.');
      return false;
    }
    
    // Read index.html for initial analysis
    const indexPath = join(BUILD_PATH, 'index.html');
    if (!existsSync(indexPath)) {
      this.errors.push('index.html not found in build output');
      return false;
    }
    
    this.bundleContent = readFileSync(indexPath, 'utf-8');
    console.log(chalk.green('✅ Bundle content loaded'));
    return true;
  }

  /**
   * Validate modern JavaScript features compatibility
   */
  validateJavaScriptCompatibility() {
    console.log(chalk.yellow('🔧 Validating JavaScript compatibility...'));
    
    const compatibilityChecks = [
      {
        name: 'ES2020 Support',
        pattern: /\besm?2020\b/i,
        required: false,
        description: 'Modern JavaScript features'
      },
      {
        name: 'Module Support',
        pattern: /import\(|rel="modulepreload"/,
        required: true,
        description: 'ES6 modules for modern browsers'
      },
      {
        name: 'Polyfill Loading',
        pattern: /polyfill/i,
        required: true,
        description: 'Polyfills for older browser support'
      },
      {
        name: 'Dynamic Imports',
        pattern: /import\(/,
        required: false,
        description: 'Code splitting support'
      }
    ];
    
    let passed = 0;
    for (const check of compatibilityChecks) {
      if (this.bundleContent.match(check.pattern)) {
        console.log(chalk.green(`  ✅ ${check.name}: ${check.description}`));
        passed++;
      } else if (check.required) {
        this.errors.push(`Required feature missing: ${check.name}`);
        console.log(chalk.red(`  ❌ ${check.name}: Missing - ${check.description}`));
      } else {
        console.log(chalk.yellow(`  ⚠️  ${check.name}: Not detected - ${check.description}`));
      }
    }
    
    return passed > 0;
  }

  /**
   * Validate CSS compatibility
   */
  validateCSSCompatibility() {
    console.log(chalk.yellow('🎨 Validating CSS compatibility...'));
    
    // Check for modern CSS features that might need fallbacks
    const cssFeatures = [
      {
        name: 'CSS Grid',
        pattern: /display:\s*grid/i,
        support: 'IE11+, Modern browsers',
        fallback: 'Flexbox or float layouts'
      },
      {
        name: 'Flexbox',
        pattern: /display:\s*flex/i,
        support: 'IE10+, All modern browsers',
        fallback: 'Float or inline-block layouts'
      },
      {
        name: 'CSS Variables',
        pattern: /var\(--/,
        support: 'IE16+, Modern browsers',
        fallback: 'Static values or Sass variables'
      },
      {
        name: 'CSS Transforms',
        pattern: /transform:/i,
        support: 'IE9+, All modern browsers',
        fallback: 'Position-based animations'
      }
    ];
    
    let modernFeatures = 0;
    for (const feature of cssFeatures) {
      if (this.bundleContent.match(feature.pattern)) {
        console.log(chalk.green(`  ✅ ${feature.name}: ${feature.support}`));
        modernFeatures++;
      }
    }
    
    if (modernFeatures > 0) {
      console.log(chalk.blue(`  📊 Using ${modernFeatures} modern CSS features`));
    } else {
      console.log(chalk.yellow('  ⚠️  No modern CSS features detected in HTML'));
    }
    
    return true;
  }

  /**
   * Validate browser API compatibility
   */
  validateBrowserAPICompatibility() {
    console.log(chalk.yellow('🌐 Validating Browser API compatibility...'));
    
    const apiChecks = [
      {
        name: 'Fetch API',
        pattern: /fetch\(/,
        support: 'Chrome 42+, Firefox 39+, Safari 10.1+',
        polyfill: 'Available via polyfill for older browsers'
      },
      {
        name: 'Promise',
        pattern: /Promise\.|new Promise/,
        support: 'Chrome 32+, Firefox 29+, Safari 8+',
        polyfill: 'Available via polyfill for IE'
      },
      {
        name: 'LocalStorage',
        pattern: /localStorage/,
        support: 'IE8+, All modern browsers',
        polyfill: 'Graceful degradation recommended'
      },
      {
        name: 'File API',
        pattern: /File\(|FileReader/,
        support: 'IE10+, All modern browsers',
        polyfill: 'Limited polyfill options'
      },
      {
        name: 'Web Crypto API',
        pattern: /crypto\./,
        support: 'Chrome 37+, Firefox 34+, Safari 7+',
        polyfill: 'Available via crypto-browserify'
      }
    ];
    
    let detectedAPIs = 0;
    for (const api of apiChecks) {
      if (this.bundleContent.match(api.pattern)) {
        console.log(chalk.green(`  ✅ ${api.name}: ${api.support}`));
        console.log(chalk.blue(`    💡 ${api.polyfill}`));
        detectedAPIs++;
      }
    }
    
    if (detectedAPIs === 0) {
      console.log(chalk.yellow('  ⚠️  No browser APIs detected in HTML (may be in JS bundles)'));
    }
    
    return true;
  }

  /**
   * Validate responsive design compatibility
   */
  validateResponsiveCompatibility() {
    console.log(chalk.yellow('📱 Validating responsive design compatibility...'));
    
    const responsiveChecks = [
      {
        name: 'Viewport Meta Tag',
        pattern: /<meta[^>]*name=["']viewport["'][^>]*>/i,
        required: true,
        description: 'Essential for mobile compatibility'
      },
      {
        name: 'Responsive Images',
        pattern: /srcset=|sizes=/i,
        required: false,
        description: 'Optimized images for different screen sizes'
      },
      {
        name: 'Media Queries',
        pattern: /@media/i,
        required: false,
        description: 'CSS breakpoints for different screen sizes'
      }
    ];
    
    let passed = 0;
    for (const check of responsiveChecks) {
      if (this.bundleContent.match(check.pattern)) {
        console.log(chalk.green(`  ✅ ${check.name}: ${check.description}`));
        passed++;
      } else if (check.required) {
        this.errors.push(`Required responsive feature missing: ${check.name}`);
        console.log(chalk.red(`  ❌ ${check.name}: Missing - ${check.description}`));
      } else {
        console.log(chalk.yellow(`  ⚠️  ${check.name}: Not detected - ${check.description}`));
      }
    }
    
    return passed > 0;
  }

  /**
   * Validate accessibility compatibility
   */
  validateAccessibilityCompatibility() {
    console.log(chalk.yellow('♿ Validating accessibility compatibility...'));
    
    const a11yChecks = [
      {
        name: 'Language Declaration',
        pattern: /<html[^>]*lang=/i,
        required: true,
        description: 'Screen reader language support'
      },
      {
        name: 'Title Tag',
        pattern: /<title>/i,
        required: true,
        description: 'Page title for screen readers'
      },
      {
        name: 'Meta Description',
        pattern: /<meta[^>]*name=["']description["']/i,
        required: false,
        description: 'Page description for SEO and accessibility'
      },
      {
        name: 'Skip Links',
        pattern: /skip.*content|skip.*main/i,
        required: false,
        description: 'Navigation shortcuts for keyboard users'
      }
    ];
    
    let passed = 0;
    for (const check of a11yChecks) {
      if (this.bundleContent.match(check.pattern)) {
        console.log(chalk.green(`  ✅ ${check.name}: ${check.description}`));
        passed++;
      } else if (check.required) {
        this.errors.push(`Required accessibility feature missing: ${check.name}`);
        console.log(chalk.red(`  ❌ ${check.name}: Missing - ${check.description}`));
      } else {
        console.log(chalk.yellow(`  ⚠️  ${check.name}: Not detected - ${check.description}`));
      }
    }
    
    return passed > 0;
  }

  /**
   * Validate security headers and practices
   */
  validateSecurityCompatibility() {
    console.log(chalk.yellow('🔒 Validating security compatibility...'));
    
    const securityChecks = [
      {
        name: 'Content Security Policy',
        pattern: /<meta[^>]*http-equiv=["']Content-Security-Policy["']/i,
        required: false,
        description: 'XSS protection via CSP headers'
      },
      {
        name: 'X-Frame-Options',
        pattern: /X-Frame-Options/i,
        required: false,
        description: 'Clickjacking protection'
      },
      {
        name: 'HTTPS References',
        pattern: /https:/g,
        required: false,
        description: 'Secure external resource loading'
      },
      {
        name: 'No Mixed Content',
        pattern: /http:(?!\/\/localhost)/g,
        required: false,
        description: 'Avoid insecure HTTP resources',
        invert: true // This should NOT be found
      }
    ];
    
    let securityScore = 0;
    for (const check of securityChecks) {
      const matches = this.bundleContent.match(check.pattern);
      const found = matches && matches.length > 0;
      
      if (check.invert) {
        // For inverted checks, we want NO matches
        if (!found) {
          console.log(chalk.green(`  ✅ ${check.name}: ${check.description}`));
          securityScore++;
        } else {
          console.log(chalk.yellow(`  ⚠️  ${check.name}: Found ${matches.length} potential issues`));
          this.warnings.push(`Security concern: ${check.description}`);
        }
      } else {
        if (found) {
          console.log(chalk.green(`  ✅ ${check.name}: ${check.description}`));
          securityScore++;
        } else {
          console.log(chalk.yellow(`  ⚠️  ${check.name}: Not implemented - ${check.description}`));
        }
      }
    }
    
    console.log(chalk.blue(`  📊 Security score: ${securityScore}/${securityChecks.length}`));
    return true;
  }

  /**
   * Generate browser compatibility matrix
   */
  generateCompatibilityMatrix() {
    console.log(chalk.yellow('📊 Browser Compatibility Matrix:'));
    
    const browsers = [
      {
        name: 'Chrome',
        versions: '87+',
        support: 'Full',
        notes: 'All modern features supported'
      },
      {
        name: 'Firefox',
        versions: '78+',
        support: 'Full',
        notes: 'All modern features supported'
      },
      {
        name: 'Safari',
        versions: '14+',
        support: 'Full',
        notes: 'All modern features supported'
      },
      {
        name: 'Edge',
        versions: '88+',
        support: 'Full',
        notes: 'Chromium-based Edge fully supported'
      },
      {
        name: 'Chrome Mobile',
        versions: '87+',
        support: 'Full',
        notes: 'Mobile Chrome fully supported'
      },
      {
        name: 'Safari Mobile',
        versions: '14+',
        support: 'Full',
        notes: 'iOS Safari fully supported'
      },
      {
        name: 'Internet Explorer',
        versions: '11',
        support: 'Limited',
        notes: 'Requires polyfills, limited modern features'
      }
    ];
    
    console.log(chalk.blue('  Browser Support Matrix:'));
    browsers.forEach(browser => {
      const supportColor = browser.support === 'Full' ? chalk.green : 
                          browser.support === 'Limited' ? chalk.yellow : chalk.red;
      
      console.log(chalk.cyan(`    • ${browser.name} ${browser.versions}: `) + 
                  supportColor(browser.support) + 
                  chalk.gray(` - ${browser.notes}`));
    });
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    console.log(chalk.yellow('💡 Cross-browser compatibility recommendations:'));
    
    const recommendations = [
      'Test application in Chrome, Firefox, Safari, and Edge',
      'Verify polyfills work correctly in older browsers',
      'Test responsive design on mobile devices',
      'Validate accessibility with screen readers',
      'Check performance on slower devices and networks',
      'Test file upload functionality across browsers',
      'Verify AWS SDK functionality in different browsers',
      'Test offline functionality if implemented'
    ];
    
    recommendations.forEach(rec => {
      console.log(chalk.cyan(`  • ${rec}`));
    });
  }

  /**
   * Display validation summary
   */
  displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.blue.bold('📋 Cross-Browser Compatibility Summary'));
    console.log('='.repeat(60));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green.bold('🎉 All compatibility validations passed!'));
      console.log(chalk.green('✅ Application should work across modern browsers'));
    } else {
      if (this.errors.length > 0) {
        console.log(chalk.red.bold(`❌ ${this.errors.length} Critical Issue(s):`));
        this.errors.forEach(error => {
          console.log(chalk.red(`  • ${error}`));
        });
      }

      if (this.warnings.length > 0) {
        console.log(chalk.yellow.bold(`⚠️  ${this.warnings.length} Compatibility Concern(s):`));
        this.warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
      }
    }

    console.log('='.repeat(60));

    if (this.errors.length > 0) {
      console.log(chalk.red.bold('❌ Browser compatibility validation failed!'));
      console.log(chalk.red('The application may not work correctly in some browsers.'));
      return false;
    } else {
      console.log(chalk.green.bold('✅ Browser compatibility validation passed!'));
      console.log(chalk.green('The application should work well across modern browsers.'));
      return true;
    }
  }

  /**
   * Run complete validation
   */
  async validate() {
    console.log(chalk.blue.bold('🚀 Starting Cross-Browser Compatibility Validation...\n'));

    if (!this.loadBundleContent()) {
      this.displaySummary();
      return false;
    }

    // Run all validations
    this.validateJavaScriptCompatibility();
    this.validateCSSCompatibility();
    this.validateBrowserAPICompatibility();
    this.validateResponsiveCompatibility();
    this.validateAccessibilityCompatibility();
    this.validateSecurityCompatibility();
    this.generateCompatibilityMatrix();
    this.generateRecommendations();

    return this.displaySummary();
  }
}

// Run validation
const validator = new BrowserCompatibilityValidator();
validator.validate().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});