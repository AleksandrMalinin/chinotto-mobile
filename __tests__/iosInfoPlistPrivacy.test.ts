import * as fs from 'fs';
import * as path from 'path';

it('Chinotto Info.plist includes NSPhotoLibraryUsageDescription (App Store privacy)', () => {
  const plistPath = path.join(__dirname, '..', 'ios', 'Chinotto', 'Info.plist');
  const xml = fs.readFileSync(plistPath, 'utf8');
  expect(xml).toContain('<key>NSPhotoLibraryUsageDescription</key>');
});

it('Chinotto Info.plist is iPhone-only (UIDeviceFamily 1, no iPad orientation plist keys)', () => {
  const plistPath = path.join(__dirname, '..', 'ios', 'Chinotto', 'Info.plist');
  const xml = fs.readFileSync(plistPath, 'utf8');
  expect(xml).toContain('<key>UIDeviceFamily</key>');
  expect(xml).toMatch(/<key>UIDeviceFamily<\/key>\s*<array>\s*<integer>1<\/integer>\s*<\/array>/);
  expect(xml).not.toContain('UISupportedInterfaceOrientations~ipad');
});

it('Xcode project targets iPhone only (TARGETED_DEVICE_FAMILY = 1)', () => {
  const pbxPath = path.join(__dirname, '..', 'ios', 'Chinotto.xcodeproj', 'project.pbxproj');
  const text = fs.readFileSync(pbxPath, 'utf8');
  expect(text).toContain('TARGETED_DEVICE_FAMILY = 1;');
  expect(text).not.toContain('TARGETED_DEVICE_FAMILY = "1,2"');
});
