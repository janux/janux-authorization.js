/// <reference path="../collections.ts" />
/// <reference path="../../typings/tsd.d.ts" />

import List = collections.LinkedList;
import Dictionary = collections.Dictionary;
import {iAuthorizationContext} from "../api/metadata/AuthorizationContext";
import {iPermissionBit} from "../api/metadata/PermissionBit";

export default class AuthorizationContext implements iAuthorizationContext {

    private id:number;
    private name:string;
    private description:string;
    private sortOrder:number;
    private enabled:boolean;
    private bits:List<iPermissionBit>;
    private bitMap:Dictionary<String, iPermissionBit>;

    constructor(aName:string, aDescription:string) {
        if (!_.isString(aName) || _.isEmpty(aName)) {
            throw new Error('Attempting to instantiate a PermissionContext without a name');
        }

        this.name = aName;
        this.description = aDescription;
    }

    getId():number {
        return this.id;
    }

    setId(id:number):void {
        this.id = id;
    }

    getName():string {
        return this.name;
    }

    setName(name:string):void {
        this.name = name;
    }

    getPermissionBits():List<iPermissionBit> {
        if (this.bits == null)
            this.bits = new List<iPermissionBit>();

        return this.bits;
    }

    protected setPermissionBits(permissionBits:List<iPermissionBit>):void {
        this.bits = permissionBits;
    }

    getPermissionBit(name:string):iPermissionBit {
        return this.getBitMap().getValue(name);
    }

    public addPermissionBit(permBit:iPermissionBit):void {

        if (!_.isString(permBit.getName())) {
            throw new Error('Attempting to add a PermissionBit without a name to PermissionContext' + this.name);
        }

        if (this.getPermissionBit(permBit.getName()) != null) {
            throw new Error('A permission bit with name: ' + name + ' already exists in PermissionContext ' + this.name);
        }

        permBit.setPosition(this.getMaxBitPosition() + 1);
        permBit.setAuthorizationContext(this);
        this.getPermissionBits().add(permBit);

        // force refresh of bitMap on next invocation of getBitMap
        this.bitMap = null;
    }

    getPermissionsAsNumber(permBitNames: string[]): number {
        var permsValue: number = 0;

        for(var i in permBitNames){
            var permName: string = permBitNames[i];
            if (this.getPermissionBit(permName) != null) {
                permsValue += this.getPermissionBit(permName).getValue();
            } else {
                var msg:string = 'The permission ' + permName + ' is not defined in the Permission Context ' + this.getName();
                throw new Error(msg);
            }
        };

        return permsValue;
    }

    getValue(permBitNames:string[]):number {
        return this.getPermissionsAsNumber(permBitNames);
    }

    getMaxValue():number {
        return Math.pow(2.0, this.getPermissionBits().size()) - 1;
    }

    /* Human readable description of this PermissionBit Set */
    getDescription():string {
        return this.description;
    }

    setDescription(description:string):void {
        this.description = description;
    }

    getSortOrder():number {
        return this.sortOrder;
    }

    setSortOrder(sortOrder:number):void {
        this.sortOrder = sortOrder;
    }

    isEnabled():boolean {
        return this.enabled;
    }

    setEnabled(visible:boolean):void {
        this.enabled = visible;
    }

    /**
     * The set of permissions that this PermissionBit Set defines; note that this represents meta
     * information of what sort of Permissions are available to be assigned within the context of a
     * Busines Context and a Role, but that a PermissionBit Set does not confer any of these Permissions
     * per-se to any entity.
     */
    protected getBitMap():Dictionary<String, iPermissionBit> {
        if (this.bitMap == null) {
            this.bitMap = new Dictionary<String, iPermissionBit>();

            var pBit:(bit:iPermissionBit) => boolean =
                function (bit:iPermissionBit):boolean {
                    return this.bitMap.setValue(bit.getName(), bit);
                };

            this.getPermissionBits().forEach(pBit);
        }
        return this.bitMap;
    }

    /**
     * returns the highest sequential bit position of all the bits in the permissionBit List,
     * or -1 if this AuthorizationContext has no PermissionBits assigned to it; the
     * value returned by this method should be equal to (getPermissionBits().size() - 1)
     * but we expressly iterate through the permission bits and assert that fact
     */
    private getMaxBitPosition():number {
        var maxBitPos:number = -1;

        var pBit:(bit:iPermissionBit) => boolean =
            function (bit:iPermissionBit):boolean {
                maxBitPos = Math.max(bit.getPosition(), maxBitPos);
                return !!maxBitPos;
            };

        this.getPermissionBits().forEach(pBit);

        if (maxBitPos != (this.getPermissionBits().size() - 1)) {
            var msg:string = 'The highest bit position is not equal to (permissionBits.size - 1) in AuthorizationContext: ' + this.getName();
            throw new Error(msg);
        }

        return maxBitPos;
    }

    public toJSON(doShortVersion:boolean):any {
        var out:any = {};
        out.name = this.name;

        if (!doShortVersion) {
            out.description = this.description;
        }

        for (var key in this.bits) {
            out.bit = out.bit || {};
            var aBit:any = {};
            aBit.position = this.bits[key].position;

            if (!doShortVersion) {
                aBit.label = this.bits[key].label;
                aBit.description = this.bits[key].description;
                aBit.sortOrder = this.bits[key].sortOrder;
            }
            out.bit[key] = aBit;
        }
        return out;
    }

} // end class AuthorizationContext
// export = AuthorizationContextImpl;