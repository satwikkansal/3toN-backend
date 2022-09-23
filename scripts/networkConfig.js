const networks = {
    polygon_local_fork: {
      hostAddress: "0x3E14dC1b13c488a8d5D310918780c983bD5982E7",
      unlockAddress: "0xE8E5cd156f89F7bdB267EabD5C43Af3d5AF2A78f",
      unlockMappingAddress: "0xd4C62b84eb42c03A118639c39dF1Fb680FF9E776",
      daiXAddress: "0x1305F6B6Df9Dc47159D12Eb7aC2804d4A33173c2",
      usdcXAddress: "0xCAa7349CEA390F89641fe306D93591f87595dc1F",
      daiXfaucet: "0x703a1be86986a333b02f6c4a85eeb0dded23b1b8",
      daiFaucet: "0x06959153b974d0d5fdfd87d561db6d8d4fa0bb0b", // has matic and dai
      usdcXfaucet: "0x6583f33895b538dfdeee234f2d34df1033655de1",
      superfluidResolver: "0xE0cc76334405EE8b39213E620587d815967af39C",
      randomAddress1: "0x6e685a45db4d97ba160fa067cb81b40dfed47245", // has lot of matic
      randomAddress2: "0xd5c08681719445a5fdce2bda98b341a49050d821" // has lot of matic
    },
    optimism: {
      hostAddress: "0x567c4B141ED61923967cA25Ef4906C8781069a10",
      unlockAddress: "0x99b1348a9129ac49c6de7F11245773dE2f51fB0c",
      daiXAddress: "0x7d342726b69c28d942ad8bfe6ac81b972349d524",
      usdcXAddress: "0x8430f084b939208e2eded1584889c9a66b90562f",
      superfluidResolver: "0x743B5f46BC86caF41bE4956d9275721E0531B186"
    },
    goerli: {
        hostAddress: "0x22ff293e14F1EC3A09B137e9e06084AFd63adDF9",
        unlockAddress: "0x627118a4fB747016911e5cDA82e2E77C531e8206",
        daiXAddress: "0xF2d68898557cCb2Cf4C10c3Ef2B034b2a69DAD00",
        usdcXAddress: "0x8aE68021f6170E5a766bE613cEA0d75236ECCa9a",
        superfluidResolver: "0x3710AB3fDE2B61736B8BB0CE845D6c61F667a78E",
        // used for testing
        daiXfaucet: "",
        daiFaucet: "", // has matic and dai
        usdcXfaucet: "",
        randomAddress1: "", // has lot of matic
        randomAddress2: "" // has lot of matic
    }
  }

module.exports = {networks};