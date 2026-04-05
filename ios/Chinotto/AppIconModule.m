#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface AppIconModule : NSObject <RCTBridgeModule>
@end

@implementation AppIconModule

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_REMAP_METHOD(isSupported,
                 isSupportedWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@([[UIApplication sharedApplication] supportsAlternateIcons]));
}

RCT_REMAP_METHOD(getCurrentIconName,
                 getCurrentIconNameWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *name = [[UIApplication sharedApplication] alternateIconName];
    if (name == nil) {
      resolve([NSNull null]);
      return;
    }
    resolve(name);
  });
}

RCT_REMAP_METHOD(setIcon,
                 setIconWithName:(id)name
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIApplication *app = [UIApplication sharedApplication];
    if (![app supportsAlternateIcons]) {
      reject(@"unsupported", @"Alternate icons are not supported on this device.", nil);
      return;
    }

    NSString *targetName = nil;
    if ([name isKindOfClass:[NSString class]]) {
      NSString *value = (NSString *)name;
      targetName = value.length > 0 ? value : nil;
    }

    NSString *currentBefore = app.alternateIconName;
    BOOL isSame =
        ((currentBefore == nil && targetName == nil) ||
         (currentBefore != nil && targetName != nil && [currentBefore isEqualToString:targetName]));
    if (isSame) {
      resolve(currentBefore != nil ? currentBefore : [NSNull null]);
      return;
    }

    void (^finish)(NSError *_Nullable) = ^(NSError *_Nullable error) {
      if (error != nil) {
        NSString *message = [NSString stringWithFormat:@"%@ (%@:%ld)",
                                                       error.localizedDescription ?: @"Unknown error",
                                                       error.domain ?: @"unknown",
                                                       (long)error.code];
        reject(@"set_failed", message, error);
        return;
      }
      NSString *current = app.alternateIconName;
      resolve(current != nil ? current : [NSNull null]);
    };

    __block void (^attemptSet)(NSInteger);
    attemptSet = ^(NSInteger attempt) {
      [app setAlternateIconName:targetName completionHandler:^(NSError *_Nullable error) {
        // iOS can return NSPOSIXErrorDomain:35 (EAGAIN) transiently.
        if (error != nil && [error.domain isEqualToString:NSPOSIXErrorDomain] && error.code == 35 &&
            attempt < 5) {
          NSTimeInterval delay = 0.25 * (attempt + 1);
          dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(delay * NSEC_PER_SEC)),
                         dispatch_get_main_queue(), ^{
                           attemptSet(attempt + 1);
                         });
          return;
        }
        finish(error);
      }];
    };

    attemptSet(0);
  });
}

@end
