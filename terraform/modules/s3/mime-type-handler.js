const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// MIME type mappings for static assets
const MIME_TYPES = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.jsx': 'application/javascript',
  '.ts': 'application/javascript',
  '.tsx': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip'
};

// Cache control settings for different file types
const CACHE_CONTROL = {
  '.js': 'public, max-age=31536000, immutable',  // 1 year for JS modules
  '.mjs': 'public, max-age=31536000, immutable',
  '.css': 'public, max-age=31536000, immutable',
  '.svg': 'public, max-age=2592000',  // 30 days for images
  '.png': 'public, max-age=2592000',
  '.jpg': 'public, max-age=2592000',
  '.jpeg': 'public, max-age=2592000',
  '.gif': 'public, max-age=2592000',
  '.webp': 'public, max-age=2592000',
  '.ico': 'public, max-age=2592000',
  '.woff': 'public, max-age=31536000',  // 1 year for fonts
  '.woff2': 'public, max-age=31536000',
  '.ttf': 'public, max-age=31536000',
  '.eot': 'public, max-age=31536000',
  '.html': 'public, max-age=300',  // 5 minutes for HTML
  '.json': 'public, max-age=300',
  '.md': 'public, max-age=300',
  '.txt': 'public, max-age=300'
};

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    for (const record of event.Records) {
      if (record.eventName.startsWith('ObjectCreated')) {
        const bucketName = record.s3.bucket.name;
        const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        
        console.log(`Processing object: ${objectKey} in bucket: ${bucketName}`);
        
        // Get file extension
        const extension = getFileExtension(objectKey);
        const mimeType = MIME_TYPES[extension];
        const cacheControl = CACHE_CONTROL[extension];
        
        if (mimeType) {
          console.log(`Setting MIME type for ${objectKey}: ${mimeType}`);
          
          // Get current object metadata
          const getObjectParams = {
            Bucket: bucketName,
            Key: objectKey
          };
          
          const currentObject = await s3.getObject(getObjectParams).promise();
          
          // Copy object with correct metadata
          const copyParams = {
            Bucket: bucketName,
            Key: objectKey,
            CopySource: `${bucketName}/${objectKey}`,
            ContentType: mimeType,
            CacheControl: cacheControl || 'public, max-age=86400',  // Default 1 day
            MetadataDirective: 'REPLACE',
            Metadata: {
              ...currentObject.Metadata,
              'content-type-set-by': 'lambda-mime-handler'
            }
          };
          
          await s3.copyObject(copyParams).promise();
          console.log(`Successfully updated MIME type for ${objectKey}`);
        } else {
          console.log(`No MIME type mapping found for extension: ${extension}`);
        }
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'MIME types processed successfully' })
    };
  } catch (error) {
    console.error('Error processing MIME types:', error);
    throw error;
  }
};

function getFileExtension(filename) {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return filename.substring(lastDotIndex).toLowerCase();
}