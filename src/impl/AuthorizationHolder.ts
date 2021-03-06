/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="../collections.ts" />

import _ = require('lodash');
import basarat = require('../collections');
import collections = basarat.collections;
import Dictionary = collections.Dictionary;
import List = collections.LinkedList;
import {AuthorizationContext} from './AuthorizationContext';
import {iAuthorizationHolder} from '../api/AuthorizationHolder';
import {Role} from './Role';

/**
 ***************************************************************************************************
 * Implementation convenience class that factors in one class the functions
 * that derive the permissions that a Role or Account may have based on its
 * associated roles and permissions granted
 *
 * @author  <a href="mailto:philippe.paravicini@janux.org">Philippe Paravicini</a>
 * @version $Revision: 1.8 $ - $Date: 2007-12-27 00:51:17 $
 ***************************************************************************************************
 */
export class AuthorizationHolder implements iAuthorizationHolder
{
    get typeName():string {
        return 'janux.security.AuthorizationHolder';
    }

    protected name:string;
    public isAlmighty:boolean;
    protected roles: List<Role>;

    // protected  authContexts: Dictionary<string, AuthorizationContext>;
    protected authContexts: string[];
    protected permissions: Object;

    /** this is declared as protected simply for testing purposes */
    protected permissionsGranted: Dictionary<string, {context: AuthorizationContext, grant: number}>
		= new Dictionary<string, {context: AuthorizationContext, grant: number}>();

    constructor(){}

    getRoles(): List<Role> {
        if (this.roles == null) { this.roles = new List<Role>(); }
        return this.roles;
    }

    setRoles(aggrRoles: List<Role>): void {
        this.roles = aggrRoles;
    }

    grant(permsGranted: string[]|number, authContext: AuthorizationContext): AuthorizationHolder {

        if (!_.isArray(permsGranted) && !_.isNumber(permsGranted)) {
            throw new Error("You must pass either a number or an array of string permissions when granting permissions");
        }

        else if (authContext == null) {
            throw new Error('Attempting to assign permissions to entity ' + this.name + ' with null AuthorizationContext');
        }

        var permsValue = _.isArray(permsGranted) ? authContext.getPermissionsAsNumber(permsGranted) : permsGranted;

        if ( permsValue > authContext.getMaxValue() ) {
            throw new Error( 'The permission bitmask that you are trying to assign: ' + permsValue
                + ' has a value greater than the maximum ' + authContext.getMaxValue()
                + ' that can be assigned in the context of AuthorizationContext ' + authContext.name
                + ' to entity ' + this.name);
        }

        if (this.permissionsGranted == null) {
            this.permissionsGranted = new Dictionary<string, {context: AuthorizationContext, grant: number}>();
        }

        if (permsValue > 0) {
            this.permissionsGranted.setValue(
                authContext.name,
                { context: <AuthorizationContext> authContext, grant: <number> permsValue }
            );
        } else {
            this.permissionsGranted.remove(authContext.name);
        }
        return this;
    }

    hasPermissions(permNames: string[], authContextName: string): boolean {

        // almighty users have all permissions for now (TODO: add 'deny' mechanism)
        if (this.isAlmighty) { return true; }

        var permsGranted = this.permissionsGranted.getValue(authContextName);
        if (!_.isObject(permsGranted)) { return false; }

        var authContext = permsGranted.context;
        var requiredPerms = -1;
        try
        {
            requiredPerms = authContext.getPermissionsAsNumber(permNames);
        }
        catch (e)
        {
            console.warn('WARNING: ' + e );
            return false;
        }

        /* jshint bitwise:false */
        var match = permsGranted.grant & requiredPerms;
        // console.log('match is: ', match);
        /* jshint bitwise:true */

        return match === requiredPerms;
    }

    hasPermission(permissionName: string, authContextName: string): boolean {
        var perm:string[] = [permissionName];
        return this.hasPermissions(perm, authContextName);
    }

    can(permNames: string|string[], authContextName: string): boolean {
        if (_.isArray(permNames)) {
            return this.hasPermissions(permNames, authContextName);
        } else if (_.isString(permNames)) {
            return this.hasPermission(permNames, authContextName);
        } else {
            return false;
        }
    }

    toJSON(): any {
        var out = _.clone(this);
        delete out.permissionsGranted;
        delete out.isAlmighty;

        var perm;
        // outputs permissionsGranted separately from permissionsContexts to make json msg more readable
        // "permissions": {
        //   "PROPERTY":{"grant":3},
        //   "ACCOUNT":{"deny":7,}   // revokes inherited permissions, not yet implemented
        //   "EQUIPMENT":{"grant":3, "deny":4} // edge case, not yet implemented
        // }
        this.permissionsGranted.forEach((contextName: string, pGranted: {context: AuthorizationContext, grant: number})=>{
            out.permissions = out.permissions || {};
            perm = pGranted;
            out.permissions[contextName] = {};
            if (perm.grant) {out.permissions[contextName].grant = perm.grant;}
            if (perm.deny)  {out.permissions[contextName].deny  = perm.deny;}

            out.authContexts = out.authContexts || [];
            out.authContexts.push(perm.context.toJSON(true)); // true = doShortVersion
        });
        return out;
    }

    toString() {
        // Short hand. Adds each own property
        return collections.makeString(this);
    }

} // end class AuthorizationHolder
