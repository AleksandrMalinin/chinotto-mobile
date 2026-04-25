#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetThoughtsBridge, NSObject)

RCT_EXTERN_METHOD(setRecentThoughts:(NSString *)json
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
