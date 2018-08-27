'use strict';

/// <reference path="../collections.ts" />

import * as _ from "lodash";
import basarat = require('../collections');
import collections = basarat.collections;
import Dictionary = basarat.collections.Dictionary;
import {iAuthorizationContext} from "../api/AuthorizationContext";
import {PermissionBit} from "./PermissionBit";

export class AuthorizationContext implements iAuthorizationContext {

    get typeName():string {
        return 'janux.security.AuthorizationContext';
    }

    public name:string;
    public description:string;
    public sortOrder:number;
    public enabled:boolean;

    // stores permission bits indexed by name
    private _bit: Dictionary<string, PermissionBit> = new Dictionary<string, PermissionBit>();
    // stores permission bits ordered by bit position
    private authBitList:Dictionary<number, PermissionBit> = new Dictionary<number, PermissionBit>();

    constructor(aName:string, aDescription:string, permBits?: any) {
        if (!_.isString(aName) || _.isEmpty(aName)) {
            throw new Error('Attempting to instantiate a PermissionContext without a name');
        }

        this.name = aName;
        this.description = aDescription;

        if(typeof this.authBitList === 'undefined'){
            this.authBitList = new Dictionary<number, PermissionBit>();
        }

        if(typeof permBits !== 'undefined' && permBits.length > 0){
            var that = this;
            permBits.forEach( function(bitName) {
                that.addPermissionBit(bitName, 'Grants permission to '+bitName+' a '+that.description);
            });
        }
    }

    public permissionBits(): Dictionary<string, PermissionBit> {
        return this._bit;
    }

    public permissionBitsAsList(): Array<PermissionBit> {
        var out: Array<PermissionBit> = new Array<PermissionBit>();

        this.authBitList.forEach((kBit: number, bit:PermissionBit)=>{
            out[kBit] = bit;
        });

        return out;
    }

    public permissionBit(name:string): PermissionBit {
        var pB = this.getBitMap().getValue(name); // this.getBitMap().getValue(name);
        if(typeof pB === 'undefined'){
            return null;
        }
        else {
            return pB;
        }
    }

    /**
     * Adds a PermissionBit to this PermissionContext, makes sure that there are no two PermissionBits
     * with the same name and that the value of PermissionBit.position is sequential and without
     * gaps
     */
    public addPermissionBit(permissionBit: PermissionBit): void;
    public addPermissionBit(bitName?: string, bitDescr?: string, sortOrder?: number): void;
    public addPermissionBit(arg?: string | PermissionBit, bitDescr?: string, sortOrder?: number): void {

        var permBit: PermissionBit;

        if(typeof arg === 'string'){
            permBit = new PermissionBit(arg, bitDescr, sortOrder);
        }else if(typeof arg === 'object'){
            permBit = arg;
        }
        else{
            throw new Error('Unable to add permissionBit, wrong parameters. The first parameter can only be string or PermissionBit');
        }

        if (this.permissionBit(permBit.name) != null) {
            throw new Error('A permission bit with name: ' + name + ' already exists in PermissionContext ' + this.name);
        }

        permBit.label = permBit.name;

        // Position is defined, then we must use that value
		if(permBit.position !== -1){
			permBit.position = permBit.position;
		}
		// In this case we calculate the position depending on the order of the bits
		else {
			permBit.position = this.getMaxBitPosition() + 1;
        }

        permBit.authorizationContext = this;

        if(permBit.sortOrder === -1){
            permBit.sortOrder = permBit.position;
        }
        // store bit by position
        this.authBitList.setValue(permBit.position, permBit);
        // store bit by name
        this._bit.setValue(permBit.name, permBit);
    }

    public permissionAsNumber(permBitName: string): number {
        var permValue: number;

        if (!_.isString(permBitName)) {
            throw new Error ( 'Argument to getPermissionAsNumber must be a string');
        }

        var bit = this._bit.getValue(permBitName);

        if (!_.isObject(bit)) {
            throw new Error ('Cannot convert permission '+permBitName+' to number: it does not exist in PermissionContext '+ this.name);
        }
        permValue = Math.pow(2, bit.position);

        return permValue;
    }

    public permissionsAsNumber(permBitNames: any): number {
        if (!_.isArray(permBitNames)) {
            throw new Error ('Argument to getPermissionsAsNumber must be an array of strings');
        }

        var sumPerms = (out, perm) => {
            return out + this.permissionAsNumber(perm);
        };

        return  _.reduce(permBitNames, sumPerms, 0);
    }

    public getValue(permBitNames:string[]):number {
        return this.permissionsAsNumber(permBitNames);
    }

    public getMaxValue():number {
        return Math.pow(2.0, this.permissionBits().size()) - 1;
    }

    /**
     * The set of permissions that this PermissionBit Set defines; note that this represents meta
     * information of what sort of Permissions are available to be assigned within the context of a
     * Busines Context and a Role, but that a PermissionBit Set does not confer any of these Permissions
     * per-se to any entity.
     */
    public getBitMap():Dictionary<string, PermissionBit> {
        return this._bit;
    }

    /**
     * returns the highest sequential bit position of all the bits in the permissionBit List,
     * or -1 if this AuthorizationContext has no PermissionBits assigned to it; the
     * value returned by this method should be equal to (getPermissionBits().size() - 1)
     * but we expressly iterate through the permission bits and assert that fact
     */
    private getMaxBitPosition():number {
        var maxBitPos:number = -1;

        // _.forEach(this._bit, function (bit: PermissionBit, bName: string) {
        this._bit.forEach((bName:string, bit:PermissionBit)=>{
                maxBitPos = Math.max(bit.position, maxBitPos);
        });

        return maxBitPos;
    }

    /**
     * Passing the 'doShortVersion' boolean flag will return a barebones representation of the
     * PermissionContext; this is useful when serializing to JSON PermissionHolder entities (Role,
     * Account) that need to know about the PermissionContext metadata, but where it's desirable to keep
     * those JSON strings from being overly verbose.  The default JSON representation will return something
     * like:
     *
     * {"name":"PERSON",
	*   "description":"Defines permissions available on a Person entity",
	*   "typeName":"janux.security.PermissionContext",
	*   "bit":{
	*     "READ":{"position":0,"label":"READ","description":"Grants permission to READ a PERSON","sortOrder":0},
	*     "UPDATE":{"position":1,"label":"UPDATE","description":"Grants permission to UPDATE a PERSON","sortOrder":99}
	*   }
	* }
     *
     * whereas the short representation of the same PermissionContext would return:
     *
     * {"name":"PERSON",
	*   "bit":{
	*     "READ":{"position":0},
	*     "UPDATE":{"position":1}
	*   }
	* }
     *
     */
    public toJSON(doShortVersion?:boolean):any {
        var out:any = {};
        out.name = this.name;

        if (typeof doShortVersion === 'undefined' || !doShortVersion || String(doShortVersion) === this.name) {
            out.description = this.description;
        }

        // Preserve settings
		out.enabled = this.enabled;
        out.sortOrder = this.sortOrder;

        // _.forEach(this.bit, function (bit: PermissionBit, bName: string) {
        this._bit.forEach((bName:string, bit: PermissionBit)=>{
            out.bit = out.bit || {};
            var aBit:any = {};
            aBit.position = bit.position;

            if (!doShortVersion) {
                aBit.label = bit.name;
                aBit.description = bit.description;
                aBit.sortOrder = bit.sortOrder;
            }
            out.bit[bit.name] = aBit;
        });
        return out;
    }

    public toString() {
        // Short hand. Adds each own property
        return collections.makeString(this);
    }

    /**
     * Deserializes an AuthorizationContext from its canonical toJSON representation
     */
    static fromJSON(obj: any): AuthorizationContext {
        var out =  new AuthorizationContext(obj.name, obj.description);

        // Preserve settings
		out.enabled = obj.enabled;
		out.sortOrder = obj.sortOrder;

        var bitlist = _.toPairs(obj.bit);
        _.each(bitlist, function(tuple) {
            out.addPermissionBit(
                new PermissionBit(tuple[0],
                    tuple[1].description,
                    tuple[1].sortOrder,
                    tuple[1].position)
            );
        });
        return out;
    }

    static createInstance(aName:string, aDescription:string, permBits?: any) {
        return new AuthorizationContext(aName, aDescription, permBits);
    }

}
