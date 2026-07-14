import {
    provideHttpClient,
    withFetch,
    withInterceptors,
} from '@angular/common/http';
import {
    EnvironmentProviders,
    Provider,
    inject,
    provideEnvironmentInitializer,
} from '@angular/core';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

export const provideAuth = (): Array<Provider | EnvironmentProviders> => {
    return [
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
        provideEnvironmentInitializer(() => inject(AuthService)),
    ];
};
