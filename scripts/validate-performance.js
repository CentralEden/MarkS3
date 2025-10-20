#!/usr/bin/env node

/**
 * Static Hosting Performance Validation Script
 * Validates application loading speed, code splitting, and caching strategies
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import chalk from 'chalk';

const BUILD_PATH = resolve(process.cwd(), 'build');
const ASSETS_PATH = join(BUILD_PATH, '_app', 'immutable');

class PerformanceValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.bundleFiles = [];
    this.totalSize = 0;
    this.chunkSizes = new Map();
  }

  /**
   * Find all files recursively
   */
  findFiles(dir, extensions = ['.js', '.css']) {
    const files = [];
    if (!existsSync(dir)) return files;
    
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...this.findFiles(fullPath, extensions));
      } else if (extensions.some(ext => item.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    return files;
  }

  /**
   * Analyze bundle sizes and structure
   */
  analyzeBundleStructure() {
    console.log(chalk.yellow('📊 Analyzing bundle structure...'));
    
    if (!existsSync(BUILD_PATH)) {
      this.errors.push('Build directory not found. Run "pnpm build" first.');
      return false;
    }
    
    // Find all asset files
    this.bundleFiles = this.findFiles(ASSETS_PATH);
    
    if (this.bundleFiles.length === 0) {
      this.errors.push('No asset files found in build output.');
      return false;
    }
    
    // Analyze file sizes
    for (const file of this.bundleFiles) {
      try {
        const stats = statSync(file);
        const relativePath = file.replace(BUILD_PATH, '');
        const size = stats.size;
        
        this.chunkSizes.set(relativePath, size);
        this.totalSize += size;
      } catch (error) {
        this.warnings.push(`Failed to analyze ${file}: ${error.message}`);
      }
    }
    
    console.log(chalk.green(`✅ Analyzed ${this.bundleFiles.length} files (${(this.totalSize / 1024 / 1024).toFixed(2)}MB total)`));
    return true;
  }

  /**
   * Validate code splitting effectiveness
   */
  validateCodeSplitting() {
    console.log(chalk.yellow('✂️  Validating code splitting...'));
    
    const jsFiles = this.bundleFiles.filter(f => f.endsWith('.js'));
    const cssFiles = this.bundleFiles.filter(f => f.endsWith('.css'));
    
    console.log(chalk.blue(`  📄 JavaScript files: ${jsFiles.length}`));
    console.log(chalk.blue(`  🎨 CSS files: ${cssFiles.length}`));
    
    // Check for proper chunking
    const chunkTypes = {
      aws: jsFiles.filter(f => f.includes('aws-')).length,
      polyfills: jsFiles.filter(f => f.includes('polyfill')).length,
      vendor: jsFiles.filter(f => f.includes('vendor')).length,
      components: jsFiles.filter(f => f.includes('component')).length,
      services: jsFiles.filter(f => f.includes('service')).length
    };
    
    console.log(chalk.green('  ✅ Chunk distribution:'));
    Object.entries(chunkTypes).forEach(([type, count]) => {
      if (count > 0) {
        console.log(chalk.green(`    • ${type}: ${count} chunks`));
      }
    });
    
    // Validate chunk sizes
    const largeBundles = [];
    const mediumBundles = [];
    const smallBundles = [];
    
    for (const [file, size] of this.chunkSizes.entries()) {
      if (file.endsWith('.js')) {
        if (size > 1024 * 1024) { // > 1MB
          largeBundles.push({ file, size });
        } else if (size > 100 * 1024) { // > 100KB
          mediumBundles.push({ file, size });
        } else {
          smallBundles.push({ file, size });
        }
      }
    }
    
    console.log(chalk.blue(`  📦 Bundle size distribution:`));
    console.log(chalk.green(`    • Small (<100KB): ${smallBundles.length} files`));
    console.log(chalk.yellow(`    • Medium (100KB-1MB): ${mediumBundles.length} files`));
    console.log(chalk.red(`    • Large (>1MB): ${largeBundles.length} files`));
    
    // Check for overly large bundles
    if (largeBundles.length > 2) {
      this.warnings.push(`Too many large bundles (${largeBundles.length}). Consider further code splitting.`);
    }
    
    // Display largest bundles
    const sortedBundles = [...this.chunkSizes.entries()]
      .filter(([file]) => file.endsWith('.js'))
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    console.log(chalk.blue('  🏆 Largest JavaScript bundles:'));
    sortedBundles.forEach(([file, size]) => {
      const sizeKB = (size / 1024).toFixed(1);
      const fileName = file.split('/').pop();
      console.log(chalk.cyan(`    • ${fileName}: ${sizeKB}KB`));
    });
    
    return true;
  }

  /**
   * Validate caching strategy
   */
  validateCachingStrategy() {
    console.log(chalk.yellow('🗄️  Validating caching strategy...'));
    
    // Check for proper file naming with hashes (SvelteKit uses different pattern)
    const hashedFiles = this.bundleFiles.filter(file => {
      const fileName = file.split(/[\/\\]/).pop();
      return /\.[A-Za-z0-9_-]{8,}\.(js|css)$/.test(fileName);
    });
    
    const totalAssets = this.bundleFiles.length;
    const hashedRatio = hashedFiles.length / totalAssets;
    
    console.log(chalk.blue(`  📝 Files with cache-busting hashes: ${hashedFiles.length}/${totalAssets} (${(hashedRatio * 100).toFixed(1)}%)`));
    
    if (hashedRatio > 0.8) {
      console.log(chalk.green('  ✅ Good cache-busting strategy'));
    } else if (hashedRatio > 0.5) {
      console.log(chalk.yellow('  ⚠️  Moderate cache-busting coverage'));
      this.warnings.push('Some assets lack cache-busting hashes');
    } else {
      console.log(chalk.red('  ❌ Poor cache-busting strategy'));
      this.errors.push('Most assets lack cache-busting hashes');
    }
    
    // Check for immutable directory structure
    const immutableFiles = this.bundleFiles.filter(file => file.includes('immutable'));
    const immutableRatio = immutableFiles.length / totalAssets;
    
    console.log(chalk.blue(`  🔒 Files in immutable directory: ${immutableFiles.length}/${totalAssets} (${(immutableRatio * 100).toFixed(1)}%)`));
    
    if (immutableRatio > 0.9) {
      console.log(chalk.green('  ✅ Excellent immutable caching structure'));
    } else {
      this.warnings.push('Some assets not in immutable directory structure');
    }
    
    return true;
  }

  /**
   * Validate loading performance characteristics
   */
  validateLoadingPerformance() {
    console.log(chalk.yellow('⚡ Validating loading performance...'));
    
    // Check for critical path optimization
    const entryFiles = this.bundleFiles.filter(file => 
      file.includes('/entry/') || file.includes('app.') || file.includes('start.')
    );
    
    console.log(chalk.blue(`  🚀 Entry point files: ${entryFiles.length}`));
    
    let totalEntrySize = 0;
    entryFiles.forEach(file => {
      const size = this.chunkSizes.get(file.replace(BUILD_PATH, '')) || 0;
      totalEntrySize += size;
      const sizeKB = (size / 1024).toFixed(1);
      const fileName = file.split('/').pop();
      console.log(chalk.cyan(`    • ${fileName}: ${sizeKB}KB`));
    });
    
    const entrySizeKB = totalEntrySize / 1024;
    console.log(chalk.blue(`  📦 Total entry size: ${entrySizeKB.toFixed(1)}KB`));
    
    if (entrySizeKB < 50) {
      console.log(chalk.green('  ✅ Excellent entry point size'));
    } else if (entrySizeKB < 100) {
      console.log(chalk.yellow('  ⚠️  Moderate entry point size'));
      this.warnings.push('Entry point size could be optimized further');
    } else {
      console.log(chalk.red('  ❌ Large entry point size'));
      this.errors.push('Entry point size is too large for optimal loading');
    }
    
    // Check for lazy loading opportunities
    const lazyLoadableFiles = this.bundleFiles.filter(file => {
      const fileName = file.split('/').pop();
      return fileName && (
        fileName.includes('admin-') ||
        fileName.includes('editor-') ||
        fileName.includes('file-') ||
        /\d+\.[a-f0-9]+\.js$/.test(fileName) // Route-based chunks
      );
    });
    
    console.log(chalk.blue(`  🔄 Lazy-loadable chunks: ${lazyLoadableFiles.length}`));
    
    if (lazyLoadableFiles.length > 5) {
      console.log(chalk.green('  ✅ Good lazy loading implementation'));
    } else {
      this.warnings.push('Limited lazy loading implementation');
    }
    
    return true;
  }

  /**
   * Validate static hosting compatibility
   */
  validateStaticHostingCompatibility() {
    console.log(chalk.yellow('🌐 Validating static hosting compatibility...'));
    
    // Check index.html
    const indexPath = join(BUILD_PATH, 'index.html');
    if (!existsSync(indexPath)) {
      this.errors.push('index.html not found in build output');
      return false;
    }
    
    const indexContent = readFileSync(indexPath, 'utf-8');
    
    // Check for SPA routing support
    if (indexContent.includes('_app/') || indexContent.includes('sveltekit')) {
      console.log(chalk.green('  ✅ SvelteKit SPA structure detected'));
    } else {
      this.warnings.push('SvelteKit SPA structure not detected');
    }
    
    // Check for relative asset paths
    const absolutePaths = indexContent.match(/(?:src|href)="\/[^"]+"/g) || [];
    const relativePaths = indexContent.match(/(?:src|href)="(?!\/)[^"]*"/g) || [];
    
    console.log(chalk.blue(`  📁 Asset path analysis:`));
    console.log(chalk.cyan(`    • Relative paths: ${relativePaths.length}`));
    console.log(chalk.cyan(`    • Absolute paths: ${absolutePaths.length}`));
    
    if (absolutePaths.length === 0) {
      console.log(chalk.green('  ✅ All asset paths are relative (S3 compatible)'));
    } else {
      console.log(chalk.yellow('  ⚠️  Some absolute paths detected'));
      this.warnings.push('Some assets use absolute paths that may not work on S3');
    }
    
    // Check for proper meta tags
    const hasViewport = indexContent.includes('name="viewport"');
    const hasCharset = indexContent.includes('charset=');
    
    if (hasViewport && hasCharset) {
      console.log(chalk.green('  ✅ Essential meta tags present'));
    } else {
      this.warnings.push('Missing essential meta tags');
    }
    
    return true;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    console.log(chalk.yellow('💡 Performance recommendations:'));
    
    const recommendations = [];
    
    // Bundle size recommendations
    const jsSize = [...this.chunkSizes.entries()]
      .filter(([file]) => file.endsWith('.js'))
      .reduce((sum, [, size]) => sum + size, 0);
    
    if (jsSize > 2 * 1024 * 1024) { // > 2MB
      recommendations.push('Consider reducing JavaScript bundle size through tree shaking');
    }
    
    // Chunk recommendations
    const chunkCount = this.bundleFiles.filter(f => f.endsWith('.js')).length;
    if (chunkCount < 5) {
      recommendations.push('Consider implementing more aggressive code splitting');
    } else if (chunkCount > 20) {
      recommendations.push('Consider consolidating some smaller chunks');
    }
    
    // CSS recommendations
    const cssSize = [...this.chunkSizes.entries()]
      .filter(([file]) => file.endsWith('.css'))
      .reduce((sum, [, size]) => sum + size, 0);
    
    if (cssSize > 500 * 1024) { // > 500KB
      recommendations.push('Consider optimizing CSS bundle size');
    }
    
    if (recommendations.length === 0) {
      console.log(chalk.green('  ✅ No specific recommendations - build looks well optimized!'));
    } else {
      recommendations.forEach(rec => {
        console.log(chalk.cyan(`  • ${rec}`));
      });
    }
  }

  /**
   * Display validation summary
   */
  displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.blue.bold('📋 Static Hosting Performance Summary'));
    console.log('='.repeat(60));

    // Display key metrics
    console.log(chalk.blue('📊 Key Metrics:'));
    console.log(chalk.cyan(`  • Total bundle size: ${(this.totalSize / 1024 / 1024).toFixed(2)}MB`));
    console.log(chalk.cyan(`  • Number of chunks: ${this.bundleFiles.filter(f => f.endsWith('.js')).length}`));
    console.log(chalk.cyan(`  • CSS files: ${this.bundleFiles.filter(f => f.endsWith('.css')).length}`));
    
    const hashedFiles = this.bundleFiles.filter(file => {
      const fileName = file.split('/').pop();
      return /\.[a-f0-9]{8,}\.(js|css)$/.test(fileName);
    });
    console.log(chalk.cyan(`  • Cache-busted files: ${hashedFiles.length}/${this.bundleFiles.length}`));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green.bold('🎉 All performance validations passed!'));
      console.log(chalk.green('✅ Application is optimized for static hosting'));
    } else {
      if (this.errors.length > 0) {
        console.log(chalk.red.bold(`❌ ${this.errors.length} Critical Issue(s):`));
        this.errors.forEach(error => {
          console.log(chalk.red(`  • ${error}`));
        });
      }

      if (this.warnings.length > 0) {
        console.log(chalk.yellow.bold(`⚠️  ${this.warnings.length} Optimization Opportunity(ies):`));
        this.warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
      }
    }

    console.log('='.repeat(60));

    if (this.errors.length > 0) {
      console.log(chalk.red.bold('❌ Performance validation failed!'));
      console.log(chalk.red('The application may have performance issues in production.'));
      return false;
    } else {
      console.log(chalk.green.bold('✅ Performance validation passed!'));
      console.log(chalk.green('The application is well-optimized for static hosting.'));
      return true;
    }
  }

  /**
   * Run complete validation
   */
  async validate() {
    console.log(chalk.blue.bold('🚀 Starting Static Hosting Performance Validation...\n'));

    if (!this.analyzeBundleStructure()) {
      this.displaySummary();
      return false;
    }

    // Run all validations
    this.validateCodeSplitting();
    this.validateCachingStrategy();
    this.validateLoadingPerformance();
    this.validateStaticHostingCompatibility();
    this.generateRecommendations();

    return this.displaySummary();
  }
}

// Run validation
const validator = new PerformanceValidator();
validator.validate().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});