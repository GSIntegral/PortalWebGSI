import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, ReplaySubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from './user.types';

@Injectable({ providedIn: 'root' })
export class UserService {
    private _httpClient = inject(HttpClient);
    private _user: ReplaySubject<User> = new ReplaySubject<User>(1);
    private _currentUser: User | null = null;

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set user(value: User) {
        this._currentUser = value;
        this._user.next(value);
    }

    get user$(): Observable<User> {
        return this._user.asObservable();
    }

    get currentUser(): User | null {
        return this._currentUser;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current signed-in user data
     */
    get(): Observable<User> {
        return this._httpClient
            .get<User>(`${environment.apiUrl}/api/common/user`)
            .pipe(
                tap((user) => {
                    this._user.next(user);
                })
            );
    }

    /**
     * Update the user
     *
     * @param user
     */
    update(user: User): Observable<any> {
        return this._httpClient
            .patch<User>(`${environment.apiUrl}/api/common/user`, { user })
            .pipe(
                map((response) => {
                    this._user.next(response);
                })
            );
    }
}
