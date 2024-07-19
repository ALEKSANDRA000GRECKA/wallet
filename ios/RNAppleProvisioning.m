//
//  RNAppleProvisioning.m
//  WhalesApp
//
//  Created by VZ on 17/7/24.
//

#import "RNAppleProvisioning.h"
#import "AddCardRequestHandler.h"

@interface RNAppleProvisioning ()

@property (nonatomic, strong) AddCardRequestHandler *currentRequest;

@end

@implementation RNAppleProvisioning

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(canAddCards:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  if (![PKAddPassesViewController canAddPasses]) {
    resolve(@NO);
    return;
  }
  if (![PKAddPaymentPassViewController canAddPaymentPass]) {
    resolve(@NO);
    return;
  }
  
  resolve(@YES);
}

RCT_EXPORT_METHOD(checkIfCardIsAlreadyAdded:(NSString *)primaryAccountIdentifier
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  PKPassLibrary *library = [[PKPassLibrary alloc] init];
  NSArray<PKPass *> *passes = [library passesOfType:PKPassTypePayment]; // This returns an array of PKPass objects
  BOOL cardExists = NO;
  
  // Loop through the passes to check if the card is already added
  for (PKPaymentPass *pass in passes) {
    if ([pass isKindOfClass:[PKPaymentPass class]]) { // Check if the pass is a PKPaymentPass
      PKPaymentPass *paymentPass = (PKPaymentPass *)pass; // Cast the PKPass to PKPaymentPass
      if ([paymentPass.primaryAccountIdentifier isEqualToString:primaryAccountIdentifier]) {
        cardExists = YES;
        break;
      }
    }
  }
  
  resolve(@(cardExists));
}

RCT_EXPORT_METHOD(canAddCard:(NSString *)cardIdentifier
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  PKPassLibrary *library = [[PKPassLibrary alloc] init];
  resolve(@([library canAddPaymentPassWithPrimaryAccountIdentifier:cardIdentifier]));
}

RCT_EXPORT_METHOD(addCardToWallet:(NSDictionary *)cardDetails
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejector:(RCTPromiseRejectBlock)reject) {
  if (self.currentRequest != nil) {
    // There's an ongoing request, reject the new one
    reject(@"error", @"Another request is being processed", nil);
    return;
  }
  
  // Store the resolver and rejecter in the new PromiseCompletionHandlers object
  self.currentRequest = [[AddCardRequestHandler alloc] initWithResolver:resolve rejecter:reject cardId:cardDetails[@"cardId"] userToken:cardDetails[@"userToken"] network:cardDetails[@"network"]];

  // log currentRequest
  NSLog(@"currentRequest: %@", self.currentRequest);
  
  // Initialize the add card request configuration
  PKAddPaymentPassRequestConfiguration *config =
  [[PKAddPaymentPassRequestConfiguration alloc]
   initWithEncryptionScheme:PKEncryptionSchemeECC_V2];
  
  // Do not use the complete primary account number from the card, last four/five digits only
  config.primaryAccountSuffix = cardDetails[@"primaryAccountSuffix"];
  config.cardholderName = cardDetails[@"cardholderName"];
  config.style = PKAddPaymentPassStylePayment;
  
  // Present the add card view controller
  PKAddPaymentPassViewController *paymentPassVC =
  [[PKAddPaymentPassViewController alloc] initWithRequestConfiguration:config
                                                              delegate:self];
  if (!paymentPassVC) {
    // TODO: throw error
  }
  
  // Present the payment pass view controller
  dispatch_async(dispatch_get_main_queue(), ^{ // ensure that the presentViewController:animated:completion: call is dispatched on the main thread
    // Present the payment pass view controller on the main thread
    UIViewController *rootViewController = [UIApplication sharedApplication].delegate.window.rootViewController;
    [rootViewController presentViewController:paymentPassVC animated:YES completion:nil];
  });
}


- (void)sendDataToServerForEncryptionWithCertificates:(NSArray *)certificates nonce:(NSData *)nonce nonceSignature:(NSData *)nonceSignature completion:(void (^)(NSDictionary *response, NSError *error))completion {
  
  NSString *network = self.currentRequest.network;
  BOOL isTest = [network isEqualToString:@"test"];
  NSString *base = isTest ? @"https://card-staging.whales-api.com" : @"https://card-prod.whales-api.com";
  NSString *baseUrl = [NSString stringWithFormat:@"%@/v2/card/get/apple/provisioning/data", base];
  NSURL *url = [NSURL URLWithString:baseUrl];

  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  [request setHTTPMethod:@"POST"];
  [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
  
  // array of base64 strings of certificates
  NSMutableArray *certificatesStrings = [NSMutableArray array];

  // populate the array with base64 strings of certificates
  for (NSData *certificate in certificates) {
    NSString *certificateString = [certificate base64EncodedStringWithOptions:0];
    [certificatesStrings addObject:certificateString];
  }

  NSString *nonceString = [nonce base64EncodedStringWithOptions:0];
  NSString *nonceSignatureString = [nonceSignature base64EncodedStringWithOptions:0];
  
  NSDictionary *params = @{@"certificates": certificatesStrings,
                           @"nonce": nonceString,
                           @"nonceSignature": nonceSignatureString};
  NSDictionary *postData = @{@"params": params,
                             @"token": self.currentRequest.userToken,
                             @"id": self.currentRequest.cardId};

  NSError *error;
  NSData *postDataJSON = [NSJSONSerialization dataWithJSONObject:postData options:0 error:&error];

  if (error) {
    if (completion) completion(nil, error);
    return;
  }
  [request setHTTPBody:postDataJSON];
  
  NSURLSessionDataTask *dataTask = [[NSURLSession sharedSession] dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
    if (error) {
      if (completion) completion(nil, error);
      return;
    }
    if (data) {
      NSDictionary *responseJSON = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
      if (completion) completion(responseJSON, nil);
    }
  }];
  [dataTask resume];
}

// This method is called when the user has authorized the addition and your app needs to request the card credentials
- (void)addPaymentPassViewController:(PKAddPaymentPassViewController *)controller
 generateRequestWithCertificateChain:(NSArray *)certificates
                               nonce:(NSData *)nonce
                      nonceSignature:(NSData *)nonceSignature
                   completionHandler:(void (^)(PKAddPaymentPassRequest *))completionHandler {
  
  // Send the certificates, nonce, and nonceSignature to server to get the encrypted card data
  // The server will use the certificates, nonce, and nonceSignature to encrypt the card data
  // The server will then send the encrypted card data back to the app
  // The app will then call the completionHandler with the encrypted card data
  [self sendDataToServerForEncryptionWithCertificates:certificates nonce:nonce nonceSignature:nonceSignature completion:^(NSDictionary *response, NSError *error) {
    if (error) {
      // TODO: handle error
      NSLog(@"Error: %@", error);
    } else {
      NSLog(@"Success: %@", response);
      
      // Check if the response is successful
      if (![response[@"ok"] boolValue]) {
        // Handle the error
        NSLog(@"Error: %@", response[@"error"]);
        
        completionHandler(nil);
        
        return;
      }

      NSString *encryptedData = response[@"data"][@"encryptedData"];
      NSString *activationData = response[@"data"][@"activationData"];
      NSString *ephemeralPublicKey = response[@"data"][@"ephemeralPublicKey"];
      
      // Check response fields
      if (!encryptedData) {
        NSLog(@"Error: Encrypted data is missing");
        completionHandler(nil);
        return;
      }
      if (!activationData) {
        NSLog(@"Error: Activation data is missing");
        completionHandler(nil);
        return;
      }
      if (!ephemeralPublicKey) {
        NSLog(@"Error: Ephemeral public key is missing");
        completionHandler(nil);
        return;
      }
      
      // Once you have the encrypted pass data, activation data, and ephemeral public key from your server
      PKAddPaymentPassRequest *addRequest = [[PKAddPaymentPassRequest alloc] init];

      // Set the encrypted pass data, activation data, and ephemeral public key
      addRequest.encryptedPassData = [[NSData alloc] initWithBase64EncodedString:encryptedData options:0];
      addRequest.activationData = [[NSData alloc] initWithBase64EncodedString:activationData options:0];
      addRequest.ephemeralPublicKey = [[NSData alloc] initWithBase64EncodedString:ephemeralPublicKey options:0];
      
      completionHandler(addRequest);
    }
  }];
}

// This method is called after the card is added to the wallet or if an error occurred
- (void)addPaymentPassViewController:(PKAddPaymentPassViewController *)controller
          didFinishAddingPaymentPass:(PKPaymentPass *)pass
                               error:(NSError *)error {
  if (pass) { //added successfully
    // Resolve the promise with the card details
    if (self.currentRequest.resolver) {
      self.currentRequest.resolver(@YES);
    }
  } else { // Handle the error
    NSLog(@"Error adding card to wallet: %@", error);
    
    if (self.currentRequest.resolver) {
      self.currentRequest.resolver(@NO);
    }
  }
  
  // clear the current handlers
  self.currentRequest = nil;
  
  // Вismiss the add card view controller on error
  [controller dismissViewControllerAnimated:YES completion:nil];
}

@end
