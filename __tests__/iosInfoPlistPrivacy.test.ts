import * as fs from 'fs';
import * as path from 'path';

it('Chinotto Info.plist includes NSPhotoLibraryUsageDescription (App Store privacy)', () => {
  const plistPath = path.join(__dirname, '..', 'ios', 'Chinotto', 'Info.plist');
  const xml = fs.readFileSync(plistPath, 'utf8');
  expect(xml).toContain('<key>NSPhotoLibraryUsageDescription</key>');
});
