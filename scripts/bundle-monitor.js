#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Bundle size thresholds (in KB)
const BUNDLE_SIZE_LIMITS = {
  // Main application bundle
  main: 500,
  // AWS SDK chunks
  'aws-s3': 300,
  'aws-cognito': 200,
  'aws-credentials': 150,
  'aws-sdk-core': 400,
  // Editor chunk
  milkdown: 400,
  // Polyfills chunk
  polyfills: 200,
  // Vendor libraries
  vendor: 300,
  // Total bundle size
  total: 2000
};

// Warning thresholds (80% of limits)
const WARNING_THRESHOLDS = Object.fromEntries(
  Object.entries(BUNDLE_SIZE_LIMITS).map(([key, value]) => [key, value * 0.8])
);

class BundleMonitor {
  constructor() {
    this.distPath = resolve(__dirname, '../dist');
    this.reportPath = resolve(__dirname, '../bundle-report.json');
    this.chunks = new Map();
    this.totalSize = 0;
  }

  /**
   * Analyze bundle files and calculate sizes
   */
  analyzeBundles() {
    if (!existsSync(this.distPath)) {
      console.error(chalk.red('❌ Build directory not found. Run "pnpm build" first.'));
      process.exit(1);
    }

    try {
      // Read all JS files in assets directory
      const assetsPath = resolve(this.distPath, 'assets');
      if (!existsSync(assetsPath)) {
        console.error(chalk.red('❌ Assets directory not found in build output.'));
        process.exit(1);
      }

      const fs = await import('fs');
      const files = fs.readdirSync(assetsPath);
      
      files.forEach(file => {
        if (file.endsWith('.js')) {
          const filePath = resolve(assetsPath, file);
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024);
          
          // Determine chunk type based on filename
          const chunkType = this.identifyChunkType(file);
          
          if (!this.chunks.has(chunkType)) {
            this.chunks.set(chunkType, { files: [], size: 0 });
          }
          
          const chunk = this.chunks.get(chunkType);
          chunk.files.push({ name: file, size: sizeKB });
          chunk.size += sizeKB;
          this.totalSize += sizeKB;
        }
      });

      return true;
    } catch (error) {
      console.error(chalk.red('❌ Error analyzing bundles:'), error.message);
      return false;
    }
  }

  /**
   * Identify chunk type based on filename patterns
   */
  identifyChunkType(filename) {
    if (filename.includes('aws-s3')) return 'aws-s3';
    if (filename.includes('aws-cognito')) return 'aws-cognito';
    if (filename.includes('aws-credentials')) return 'aws-credentials';
    if (filename.includes('aws-sdk-core')) return 'aws-sdk-core';
    if (filename.includes('milkdown')) return 'milkdown';
    if (filename.includes('polyfills')) return 'polyfills';
    if (filename.includes('vendor')) return 'vendor';
    if (filename.includes('index') || filename.includes('app')) return 'main';
    return 'other';
  }

  /**
   * Check bundle sizes against limits and generate warnings
   */
  checkSizeLimits() {
    const warnings = [];
    const errors = [];

    // Check individual chunks
    for (const [chunkType, chunk] of this.chunks) {
      const limit = BUNDLE_SIZE_LIMITS[chunkType];
      const warning = WARNING_THRESHOLDS[chunkType];
      
      if (limit && chunk.size > limit) {
        errors.push({
          type: 'size_exceeded',
          chunk: chunkType,
          size: chunk.size,
          limit: limit,
          files: chunk.files
        });
      } else if (warning && chunk.size > warning) {
        warnings.push({
          type: 'size_warning',
          chunk: chunkType,
          size: chunk.size,
          warning: warning,
          limit: limit,
          files: chunk.files
        });
      }
    }

    // Check total bundle size
    if (this.totalSize > BUNDLE_SIZE_LIMITS.total) {
      errors.push({
        type: 'total_size_exceeded',
        size: this.totalSize,
        limit: BUNDLE_SIZE_LIMITS.total
      });
    } else if (this.totalSize > WARNING_THRESHOLDS.total) {
      warnings.push({
        type: 'total_size_warning',
        size: this.totalSize,
        warning: WARNING_THRESHOLDS.total,
        limit: BUNDLE_SIZE_LIMITS.total
      });
    }

    return { warnings, errors };
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    for (const [chunkType, chunk] of this.chunks) {
      const limit = BUNDLE_SIZE_LIMITS[chunkType];
      
      if (limit && chunk.size > limit * 0.7) {
        switch (chunkType) {
          case 'aws-s3':
            recommendations.push({
              chunk: chunkType,
              suggestion: 'Consider using tree-shaking to remove unused S3 operations',
              impact: 'medium'
            });
            break;
          case 'aws-cognito':
            recommendations.push({
              chunk: chunkType,
              suggestion: 'Review Cognito imports and use only required authentication methods',
              impact: 'medium'
            });
            break;
          case 'milkdown':
            recommendations.push({
              chunk: chunkType,
              suggestion: 'Consider lazy loading editor components or using lighter markdown alternatives',
              impact: 'high'
            });
            break;
          case 'polyfills':
            recommendations.push({
              chunk: chunkType,
              suggestion: 'Review polyfill usage and exclude unnecessary Node.js compatibility layers',
              impact: 'medium'
            });
            break;
          case 'vendor':
            recommendations.push({
              chunk: chunkType,
              suggestion: 'Analyze vendor dependencies and consider alternatives or lazy loading',
              impact: 'high'
            });
            break;
        }
      }
    }

    // Add general recommendations
    if (this.totalSize > WARNING_THRESHOLDS.total) {
      recommendations.push({
        chunk: 'general',
        suggestion: 'Implement code splitting for non-critical components',
        impact: 'high'
      });
      recommendations.push({
        chunk: 'general',
        suggestion: 'Consider using dynamic imports for large dependencies',
        impact: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Save bundle report to JSON file
   */
  saveReport() {
    const { warnings, errors } = this.checkSizeLimits();
    const recommendations = this.generateRecommendations();
    
    const report = {
      timestamp: new Date().toISOString(),
      totalSize: this.totalSize,
      chunks: Object.fromEntries(this.chunks),
      limits: BUNDLE_SIZE_LIMITS,
      warnings,
      errors,
      recommendations,
      summary: {
        chunksCount: this.chunks.size,
        warningsCount: warnings.length,
        errorsCount: errors.length,
        recommendationsCount: recommendations.length
      }
    };

    try {
      writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
      console.log(chalk.green(`📊 Bundle report saved to: ${this.reportPath}`));
      return report;
    } catch (error) {
      console.error(chalk.red('❌ Error saving report:'), error.message);
      return null;
    }
  }

  /**
   * Display bundle analysis results in console
   */
  displayResults() {
    const { warnings, errors } = this.checkSizeLimits();
    
    console.log(chalk.blue('\n📦 Bundle Size Analysis\n'));
    console.log('='.repeat(50));
    
    // Display chunk sizes
    console.log(chalk.cyan('\n📊 Chunk Sizes:'));
    for (const [chunkType, chunk] of this.chunks) {
      const limit = BUNDLE_SIZE_LIMITS[chunkType];
      const percentage = limit ? Math.round((chunk.size / limit) * 100) : 0;
      
      let status = '✅';
      let color = chalk.green;
      
      if (limit && chunk.size > limit) {
        status = '❌';
        color = chalk.red;
      } else if (limit && chunk.size > WARNING_THRESHOLDS[chunkType]) {
        status = '⚠️';
        color = chalk.yellow;
      }
      
      console.log(`  ${status} ${chunkType.padEnd(15)} ${color(`${chunk.size}KB`)} ${limit ? `(${percentage}% of ${limit}KB limit)` : ''}`);
    }
    
    // Display total size
    const totalPercentage = Math.round((this.totalSize / BUNDLE_SIZE_LIMITS.total) * 100);
    let totalStatus = '✅';
    let totalColor = chalk.green;
    
    if (this.totalSize > BUNDLE_SIZE_LIMITS.total) {
      totalStatus = '❌';
      totalColor = chalk.red;
    } else if (this.totalSize > WARNING_THRESHOLDS.total) {
      totalStatus = '⚠️';
      totalColor = chalk.yellow;
    }
    
    console.log(`\n  ${totalStatus} ${'Total'.padEnd(15)} ${totalColor(`${this.totalSize}KB`)} (${totalPercentage}% of ${BUNDLE_SIZE_LIMITS.total}KB limit)`);
    
    // Display warnings
    if (warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      warnings.forEach(warning => {
        if (warning.type === 'size_warning') {
          console.log(`  • ${warning.chunk} chunk is ${warning.size}KB (approaching ${warning.limit}KB limit)`);
        } else if (warning.type === 'total_size_warning') {
          console.log(`  • Total bundle size is ${warning.size}KB (approaching ${warning.limit}KB limit)`);
        }
      });
    }
    
    // Display errors
    if (errors.length > 0) {
      console.log(chalk.red('\n❌ Errors:'));
      errors.forEach(error => {
        if (error.type === 'size_exceeded') {
          console.log(`  • ${error.chunk} chunk exceeds limit: ${error.size}KB > ${error.limit}KB`);
        } else if (error.type === 'total_size_exceeded') {
          console.log(`  • Total bundle size exceeds limit: ${error.size}KB > ${error.limit}KB`);
        }
      });
    }
    
    // Display recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log(chalk.blue('\n💡 Optimization Recommendations:'));
      recommendations.forEach(rec => {
        const impact = rec.impact === 'high' ? chalk.red('HIGH') : 
                      rec.impact === 'medium' ? chalk.yellow('MEDIUM') : 
                      chalk.green('LOW');
        console.log(`  • [${impact}] ${rec.suggestion}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Exit with error code if there are errors
    if (errors.length > 0) {
      console.log(chalk.red('\n❌ Bundle size check failed!'));
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Bundle size check completed with warnings.'));
    } else {
      console.log(chalk.green('\n✅ Bundle size check passed!'));
    }
  }

  /**
   * Run complete bundle analysis
   */
  async run() {
    console.log(chalk.blue('🔍 Analyzing bundle sizes...\n'));
    
    if (!this.analyzeBundles()) {
      process.exit(1);
    }
    
    this.saveReport();
    this.displayResults();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new BundleMonitor();
  monitor.run().catch(error => {
    console.error(chalk.red('❌ Bundle analysis failed:'), error);
    process.exit(1);
  });
}

export { BundleMonitor };