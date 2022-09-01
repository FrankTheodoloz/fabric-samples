/*
 * SPDX-License-Identifier: Apache-2.0
 */
// Deterministic JSON.stringify()
import {Context, Contract, Info, Returns, Transaction} from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import {Asset} from './asset';

@Info({title: 'DataSharing', description: 'Smart contract for Data Sharing'})
export class DataSharingContract extends Contract {

    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        const assets: Asset[] = [
            {
                ID: 'asset1',
                Filename: 'asset1.txt',
                Size: 5,
                Hash: 'asset1Hash',
                Sender: 'Tomoko',
                UploadDate: Date.UTC(2021, 12, 5, 13, 56, 0, 0),
            },
            {
                ID: 'asset2',
                Filename: 'asset2.pdf',
                Size: 5,
                Hash: 'asset2Hash',
                Sender: 'Brad',
                UploadDate: Date.UTC(2021, 12, 21, 9, 12, 0, 0),
            },
            {
                ID: 'asset3',
                Filename: 'asset3.gif',
                Size: 10,
                Hash: 'asset3Hash',
                Sender: 'Jin Soo',
                UploadDate: Date.UTC(2022, 2, 19, 18, 5, 0, 0),
            },
            {
                ID: 'asset4',
                Filename: 'asset4.zip',
                Size: 10,
                Hash: 'asset4Hash',
                Sender: 'Max',
                UploadDate: Date.UTC(2022, 3, 19, 11, 18, 0, 0),
            },
            {
                ID: 'asset5',
                Filename: 'asset5.doc',
                Size: 15,
                Hash: 'asset5Hash',
                Sender: 'Adriana',
                UploadDate: Date.UTC(2022, 3, 24, 1, 45, 0, 0),
            },
            {
                ID: 'asset6',
                Filename: 'asset6.mp3',
                Size: 15,
                Hash: 'asset6Hash',
                Sender: 'Michel',
                UploadDate: Date.UTC(2022, 7, 3, 17, 5, 0, 0),
            },
        ];

        for (const asset of assets) {
            // asset.docType = 'asset';
            // example of how to write to world state deterministically
            // use convention of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresponding hash
            await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
            console.info(`Asset ${asset.ID} initialized`);
        }
    }

    // CreateAsset issues a new asset to the world state with given details.
    @Transaction()
    public async CreateAsset(ctx: Context, id: string, filename: string, size: number, hash: string, sender: string): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (exists) {
            throw new Error(`The asset ${id} already exists`);
        }

        const asset = {
            ID: id,
            Filename: filename,
            Size: size,
            Hash: hash,
            Sender: sender,
            UploadDate: Date.now(),
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
    }

    // ReadAsset returns the asset stored in the world state with given id.
    @Transaction(false)
    public async ReadAsset(ctx: Context, id: string): Promise<string> {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    @Transaction()
    public async UpdateAsset(ctx: Context, id: string, filename: string, size: number, hash: string, sender: string): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        // overwriting original asset with new asset
        const updatedAsset = {
            ID: id,
            Filename: filename,
            Size: size,
            Hash: hash,
            Sender: sender,
            UploadDate: Date.now(),
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }

    // DeleteAsset deletes a given asset from the world state.
    @Transaction()
    public async DeleteAsset(ctx: Context, id: string): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    // AssetExists returns true when asset with given ID exists in world state.
    @Transaction(false)
    @Returns('boolean')
    public async AssetExists(ctx: Context, id: string): Promise<boolean> {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // TransferAsset updates the owner field of asset with given id in the world state, and returns the old owner.
    // @Transaction()
    // public async TransferAsset(ctx: Context, id: string, newOwner: string): Promise<string> {
    //     const assetString = await this.ReadAsset(ctx, id);
    //     const asset = JSON.parse(assetString);
    //     const oldOwner = asset.Owner;
    //     asset.Owner = newOwner;
    //     // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    //     await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
    //     return oldOwner;
    // }

    // GetAllAssets returns all assets found in the world state.
    @Transaction(false)
    @Returns('string')
    public async GetAllAssets(ctx: Context): Promise<string> {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

}
