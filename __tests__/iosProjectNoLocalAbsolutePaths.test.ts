import * as fs from 'fs';
import * as path from 'path';

/**
 * Absolute paths like /Users/... in project.pbxproj break EAS Build (different checkout path).
 */
it('Chinotto.xcodeproj has no /Users/ absolute paths in PBXFileReference paths', () => {
  const pbxPath = path.join(__dirname, '..', 'ios', 'Chinotto.xcodeproj', 'project.pbxproj');
  const pbx = fs.readFileSync(pbxPath, 'utf8');
  expect(pbx).not.toMatch(/path = "\/Users\//);
});
