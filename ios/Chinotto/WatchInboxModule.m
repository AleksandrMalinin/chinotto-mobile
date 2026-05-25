#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(WatchInboxModule, RCTEventEmitter)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
