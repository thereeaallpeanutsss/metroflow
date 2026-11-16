/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-619edae6'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "index.html",
    "revision": "628c0694bb010e0cdf8936e3b4e29244"
  }, {
    "url": "404.html",
    "revision": "f70cf9eff27d988c959069ad116ee5f6"
  }, {
    "url": "assets/index-DnSDTI1G.js",
    "revision": null
  }, {
    "url": "assets/index-D6jhxaPt.css",
    "revision": null
  }, {
    "url": "app-icon.png",
    "revision": "30ebce14c1295f4d22e6eb1c20945f9b"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "2ebe22244cfc7da8d6c553288a2225e0"
  }, {
    "url": "pwa-192x192.png",
    "revision": "c4c98e39e08b4b281e7608f3897c1fff"
  }, {
    "url": "pwa-512x512.png",
    "revision": "30ebce14c1295f4d22e6eb1c20945f9b"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "59a9cd186334e5ba105458bec20d0d92"
  }, {
    "url": "manifest.webmanifest",
    "revision": "564f48874d2b789141b216a3eb3e3437"
  }], {});
  workbox.cleanupOutdatedCaches();

}));
