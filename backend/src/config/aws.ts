import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'your-aws-region',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'YOUR_AWS_ACCESS_KEY_ID',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'YOUR_AWS_SECRET_ACCESS_KEY'
  }
});

export default AWS;
