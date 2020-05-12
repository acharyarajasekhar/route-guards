import { Injectable, Optional, Inject, NgZone } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { User } from 'firebase';
import { FIREBASE_OPTIONS, FirebaseOptions, FirebaseAppConfig, ɵfirebaseAppFactory, ɵAngularFireSchedulers, FIREBASE_APP_NAME } from '@angular/fire';
import { observeOn, switchMap, map, shareReplay, take } from 'rxjs/operators';
import { resolve } from 'url';

@Injectable({
  providedIn: 'root'
})
export class RedirectLoggedInToGuard implements CanActivate {

  authState: Observable<User | null>;

  constructor(
    @Inject(FIREBASE_OPTIONS) options: FirebaseOptions,
    @Optional() @Inject(FIREBASE_APP_NAME) nameOrConfig: string | FirebaseAppConfig | null | undefined,
    zone: NgZone,
    private router: Router
  ) {
    const auth = of(undefined).pipe(
      observeOn(new ɵAngularFireSchedulers(zone).outsideAngular),
      switchMap(() => zone.runOutsideAngular(() => import('firebase/auth'))),
      observeOn(new ɵAngularFireSchedulers(zone).insideAngular),
      map(() => ɵfirebaseAppFactory(options, zone, nameOrConfig)),
      map(app => app.auth()),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.authState = auth.pipe(
      switchMap(auth => new Observable<User | null>(auth.onAuthStateChanged.bind(auth)))
    );
  }


  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    let redirectUrl = next.data.redirectUrl;

    return new Promise(res => {
      this.authState.pipe(take(1)).subscribe(user => {
        if (!!user && !!redirectUrl) {
          res(this.router.createUrlTree(redirectUrl));
        } else {
          res(true);
        }
      })
    })

  }

}
