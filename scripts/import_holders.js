import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

const holders = [
  {
    wallet_address: "DXM1SKEbtDVFJcqLDJvSBSh83CeHkYv4qM88JG9BwJ5t",
    token_account: "857soYnFmYzTU9gAuYZATCe1fwozRBVGidzV5vf3X9m3",
    balance: 4136196.00,
    percentage: 41.87
  },
  {
    wallet_address: "BX1PEe4FJiWuHjFnYuYFB8edZsFg39BWggi65yTH52or",
    token_account: "9PhXMK9MUrx3XHdwnUd8SWCXJMN4dn1t6VphM4ag9S9t",
    balance: 1000300.00,
    percentage: 10.13
  },
  {
    wallet_address: "FAEjAsCtpoapdsCF1DDhj71vdjQjSeAJt8gt9uYxL7gz",
    token_account: "HyBS72PmHuhwX7Z6qLM9HaLsboKHZy4se27sDMkqEgqd",
    balance: 493253.00,
    percentage: 4.99
  },
  {
    wallet_address: "95vRUfprVqvURhPryNdEsaBrSNmbE1uuufYZkyrxyjir",
    token_account: "5B6wB3PpxVttsUi4511xYRy6giGdHCeGwSLJRY9V1px4",
    balance: 484898.00,
    percentage: 4.91
  },
  {
    wallet_address: "He7HLAH2v8pnVafzxmfkqZUVefy4DUGiHmpetQFZNjrg",
    token_account: "Jh4BVgcD9Pp3TFJzxxVDeyp1TPUioY3k4cwj7GjaLsJ",
    balance: 457592.00,
    percentage: 4.63
  },
  {
    wallet_address: "FYfLzXckAf2JZoMYBz2W4fpF9vejqpA6UFV17d1A7C75",
    token_account: "2ViuF6cWJ5PH9sXwC8RFK8azwdNEQM4aKnfhF6qUSjNH",
    balance: 452008.84,
    percentage: 4.58
  },
  {
    wallet_address: "9pRsKWUw2nQBfdVhfknyWQ4KEiDiYvahRXCf9an4kpW4",
    token_account: "CFJdc43HP5q9N9KMkhy9oaoRZKYiAXnEcVmpdYaD1tci",
    balance: 409616.00,
    percentage: 4.15
  },
  {
    wallet_address: "FFfTserUJGZEFLKB7ffqxaXvoHfdRJDtNYgXu7NEn8an",
    token_account: "4aCuUNM8fmZ4EJgMSuqAXyB7Nh5oQVeejN2gEdhfmjyB",
    balance: 404664.00,
    percentage: 4.10
  },
  {
    wallet_address: "EhCeavQuvQRf2uSNPW1dJb8hHqa511TyzDXyjM2BTr4x",
    token_account: "Ah1shzAVmzveXiJNjqQXYKLgtziikcexmrKW44dvsZdN",
    balance: 306293.27,
    percentage: 3.10
  },
  {
    wallet_address: "H4RPEi5Sfpapy1B233b4DUhh6hsmFTTKx4pXqWnpW637",
    token_account: "32B5gWmvmTgASxqdxDhgweo2CdcxVtCkx4t4Y2DTdu1C",
    balance: 199100.00,
    percentage: 2.02
  },
  {
    wallet_address: "GBowhf35uo25ThZRByBxJj1wpCYPZrLvXNMmzz4H2YZA",
    token_account: "Aao3W2uYHYmJGqcsVwPsQioyMXuS2U4o2hQKfPT7xR9A",
    balance: 120352.45,
    percentage: 1.22
  },
  {
    wallet_address: "2WYixkyapdnXPv5g3W9ZqWXC9KM4a9xAGrikbeVQn73y",
    token_account: "5es92WeUZFnCPfSr631HVUJQCZNQ93uARLZSevg8ZYdi",
    balance: 110850.00,
    percentage: 1.12
  },
  {
    wallet_address: "AcWwsEwgcEHz6rzUTXcnSksFZbETtc2JhA4jF7PKjp9T",
    token_account: "Gvh95fVGhgRQEZ5SxpTsC1DEAricWqJkYqaV44svaeH",
    balance: 101026.16,
    percentage: 1.02
  },
  {
    wallet_address: "HFvyKsf4BRo1yWHb4ATjcX3pELqapu8YErbhdAC4bW1v",
    token_account: "FktfpEUkNLmBqxgET22hzrB2gjSGNHYGy8kRHh6on9Na",
    balance: 94784.17,
    percentage: 0.96
  },
  {
    wallet_address: "47KciSwxSwfyczXmPhDsZRpBTfLoNY1FXkiZb4ay4JUa",
    token_account: "7L66SJcQyWfAhbmM7GK8d7shta2EpFYLELWERQ4P8eop",
    balance: 85312.99,
    percentage: 0.86
  },
  {
    wallet_address: "9FdEErSA8N9kkyukLHLsKTyyu6vN3iNq4vpQLN1rdWpc",
    token_account: "4TFfibEgRwVAtMeDQ8gJgpN8edtysmdzwM7QMRgwd7eN",
    balance: 73907.00,
    percentage: 0.75
  },
  {
    wallet_address: "AfVXtsmsbmeVDuYSTdEQdiJsYKsi8EKZEdzoTmRb8mQ",
    token_account: "GirsJCuuZAguFaWXQMr59xnJKzTdYxrZ76e3vDa9Qbir",
    balance: 59871.25,
    percentage: 0.61
  },
  {
    wallet_address: "6ngUm36nabsREufTBRNGuif5pyEffaZqj2ik7NqEJfL5",
    token_account: "8aoU4zo3vZ6XcRDjRHT7v4PnrSsFSUdGrFumHUaoYLTz",
    balance: 55319.49,
    percentage: 0.56
  },
  {
    wallet_address: "7azqm8HWqiqZPrcgWoBbtNc9HykxpzK5zGTuiJXkpzNZ",
    token_account: "DWfHzUDbucdE8iu8qfjQiH16kLybs9zqTvUAzd86aexC",
    balance: 44699.11,
    percentage: 0.45
  },
  {
    wallet_address: "63T32BUbMNTSeemfGKAuL4NB5xfjSeUHRUkHqn92Sjuj",
    token_account: "G6F9kPe1YQKkX7Nhjuv6xscbk4UUjgCSg8SPy8c77cyg",
    balance: 38906.26,
    percentage: 0.39
  },
  {
    wallet_address: "7EoZQLvw7F8f4xwWnHPFM6PttwyAT9uWFPVUuJEFDNxh",
    token_account: "asTbUeusvSS3r8Vm635avUmkBHTW1QLCcR3wkUMMAA3",
    balance: 37632.37,
    percentage: 0.38
  },
  {
    wallet_address: "CxKWhsTKhyAWYdttDrxBEQLsvq5FYtbMZDmGb2EkSTkn",
    token_account: "CbTG8AAv8prwpgF8Gv4sLq3d3ZiPQuP5jaqsNUPhKHPF",
    balance: 36402.61,
    percentage: 0.37
  },
  {
    wallet_address: "HWh5GrTXfCtrLd49i5URWv2QKHMxEKsxEHoNR6EuksWC",
    token_account: "CSPFxr5CEPjCL4jUKXxBZ5Mu7pTETbAMjaSzTpLkuNA6",
    balance: 34543.99,
    percentage: 0.35
  },
  {
    wallet_address: "EFwA7nqU4XYi44mspmWacTV5C4ivjnm2Mgd9ExN5hpFM",
    token_account: "9kGsoZxcwn1x4EsiVBvHvCrpVc74xAAnhLR5ipvV12Bc",
    balance: 33193.10,
    percentage: 0.34
  },
  {
    wallet_address: "G5tJEepNbxF3NXEgYhXAGSeBcvaLQhm4JxaG26dZHkag",
    token_account: "VEzBw8CJ9g95eevogygc3ob2mjEqcL3RFJDiLUL1Liy",
    balance: 29443.44,
    percentage: 0.30
  },
  {
    wallet_address: "MZgHwrpoLepv6yuzM7fdAKd5WXkUi5wGNq4CAkTYrXQ",
    token_account: "4nUcgdA4qaxGv4dBowk49auRWpcGva9Y9yi3pi6bJjtp",
    balance: 24908.79,
    percentage: 0.25
  },
  {
    wallet_address: "5UcXwhJ4N2oNcinLZpFf2tLLh8hbf7W5FHtpiokX5SnW",
    token_account: "Bbf1keKzjSTu4NP9zato1zrVZ5x6ekNdBAK6NeZp5L4u",
    balance: 22568.81,
    percentage: 0.23
  },
  {
    wallet_address: "94Q2QhtrLUxL1txrgSJeXMi8jdkVTQK4EZphfT9LYsmE",
    token_account: "FmKVwtsiNybBLJBeKim3eSgFXUWCuUm1FzPf2d4BVzY8",
    balance: 21271.67,
    percentage: 0.22
  },
  {
    wallet_address: "21vft9FD6um3k7UU9xbPUTcigyFtB5eAd6qUKgQmmZAV",
    token_account: "9XcNvnvcnwRJ2XtUGPhdYnwxFmBm3chS6Ce1T1o7EubE",
    balance: 20561.35,
    percentage: 0.21
  },
  {
    wallet_address: "Cdub9EQej4U9nYrZkpk3nQ7Luq7paw4YzBhHGfscxsGy",
    token_account: "6HFnLY1wbcKWSYYBUvBuNe6vC5ZbyBZFCECptABqpbQP",
    balance: 17347.68,
    percentage: 0.18
  },
  {
    wallet_address: "BHCYL69P56TzBBy1r4CxmHs6Sz9Caebgb14oTyQQkRS1",
    token_account: "2FhMH7BNq3qxzx88LFWtVF33w3U8cdSEejj9sUL1Rrgg",
    balance: 17086.30,
    percentage: 0.17
  },
  {
    wallet_address: "CpGvNQ49c6UXY7yzPAyMpwxDNQxWtDWptLViGs6CijRV",
    token_account: "N3snJCmW2raG3ksSNonA4TzV1wzoHk5UrpXn5dYkT25",
    balance: 16789.06,
    percentage: 0.17
  },
  {
    wallet_address: "9ms5WgDa2e8z7HE7PD2ci3a2WnhQEZtP4dBJePhhdhXq",
    token_account: "2PHcPeETTQ2enUFgTyKQ6nXSjNRSmfUpi9cpZR3mCNpN",
    balance: 16577.00,
    percentage: 0.17
  },
  {
    wallet_address: "HzrwHaJ8AVKwXg5fGqQQPyngk73QVjm4wJsm5hWmH9qu",
    token_account: "3gcxVRpetks9J8DifyT1ZwnusUXdb9jXpnVMQ9BKZG4n",
    balance: 15794.47,
    percentage: 0.16
  },
  {
    wallet_address: "6tt2ZKZPByrzRuevsMYgEEpy1pRUWMGtPxRh16CSxpwu",
    token_account: "BskPJwD3YpvNvHdPjM3FPqCeAChvv51qhB1Y3UUwXJXa",
    balance: 15686.95,
    percentage: 0.16
  },
  {
    wallet_address: "HKN4zACpPLhE6CBQtarSfk2Dn45NVVWTKU2RLrtCLdwA",
    token_account: "5hmcaqvsy3PMWSC3HjjLr3RZQCeBDncrdvRHDZXd6R1r",
    balance: 15404.70,
    percentage: 0.16
  },
  {
    wallet_address: "DenXVLRxRR3yrXFzwMEpnuizCcP6YMpaN9jUdZy2N8hB",
    token_account: "7KuPVuskjozU8qv7kBRmXdY6U6ErjcpNxmxAmBoShwUF",
    balance: 15319.00,
    percentage: 0.16
  },
  {
    wallet_address: "HCjdt7LNHcqByEtUFpjMoGBkcgb3iGb5mhSJaCooNfnH",
    token_account: "HYxqyHCMbbcxXpqZLQUNPrbxGAFByaKwwm2tGJohLhCR",
    balance: 14478.08,
    percentage: 0.15
  },
  {
    wallet_address: "7SzEGFW6bX2f1ULAJrHqvPipUAG4kc7N3Qt7iEnVKiqr",
    token_account: "ANGYDatdfDECnoCz589WEDeV3aJCqo4hfPydHwLiYUPm",
    balance: 13648.43,
    percentage: 0.14
  },
  {
    wallet_address: "342tqFCDTtDJXnrTd72H6TMwJGvsr4PveZLpmqxEJb24",
    token_account: "2y92ohpnZvaxByWJdg33a394KcQMm4jc9fr74EBFCMoa",
    balance: 11310.00,
    percentage: 0.11
  },
  {
    wallet_address: "Fzkih4zSTEK1qrVSZ7oiveyw35pSbb83sof1KEA7gtoy",
    token_account: "B1zBzKA5mzApWrq15eogh6LfhFWPPQjif1hfepT6R7kX",
    balance: 10574.05,
    percentage: 0.11
  },
  {
    wallet_address: "J34vpqJdUCTBj9YcvRUq6MkwRbXWWFfSiHbfQ6LKvsiE",
    token_account: "5BVbhY8M9M6Du7HpK9CnjekFPaeRrAKUfyLV4MdJxfam",
    balance: 10480.86,
    percentage: 0.11
  },
  {
    wallet_address: "7d4BfDFor6Ddyfjd5bKL4irsoez9KbdL3gcbaYLcMHYw",
    token_account: "BwE6aEutdU1o3XC3PNpd7p5byJ161JmQ5MiayBZMnNxQ",
    balance: 9822.65,
    percentage: 0.10
  },
  {
    wallet_address: "DJi5TeBtVjFhHw4Z97t3NZxNWrFRzbuEKCWZWAcnuACA",
    token_account: "AuG4NTmdmi9ecekTUYMbnSMKJMqbTYLciGeEUUaMzSnG",
    balance: 8721.42,
    percentage: 0.09
  },
  {
    wallet_address: "8jUhXV2ZNbsjAJNQH22JhZMR1dBMYUtoHW4ASroUiXaz",
    token_account: "Hf3VfBbo3jxohBZrTTsVsy8EghfWUDF9LnggkELgC2om",
    balance: 8062.00,
    percentage: 0.08
  },
  {
    wallet_address: "6j9H3CKUUGMCrbbdATG49QW6KUXCUvrF7HhBvAVGWb25",
    token_account: "6EyipgHFsBkCHYLdDD3AmCZmwaWQJLJxu1rStRkrBLmc",
    balance: 7879.00,
    percentage: 0.08
  },
  {
    wallet_address: "Cbo7JZEmVEbkcNzfoE7V3489MKwTehZ37KYJ4Me2cEDv",
    token_account: "GcnSi44N5Ky4mWfrUSpMgbrxaK2dXVBWvAPgEyMrKg3F",
    balance: 7343.28,
    percentage: 0.07
  },
  {
    wallet_address: "Aa5xb9Ri7UwmYLvtRsqbVTSiwVvj5AoyQ4Ru31wGPLFW",
    token_account: "9Cm6WgB8iNX9Ma2BbPtH2fzHiRoH9khE1thX6f9zv2Qb",
    balance: 7320.00,
    percentage: 0.07
  },
  {
    wallet_address: "7CLRkmmn2KE87bF3ce4P67SVhj1VeXs4GjtpbTgt2ric",
    token_account: "HKfEjc6rDaCnc59gn6mKzrrY8NkHy72CNF4geMks7gWo",
    balance: 7229.15,
    percentage: 0.07
  },
  {
    wallet_address: "AbwCmXYNyrpnApiRWzn9MmVEwGYq3FBvF1FTgoQLEVT",
    token_account: "EAsHYBqsctFXT6xQ7aZ1ksP3GLjFSAaFcSXm589eZjVd",
    balance: 7134.96,
    percentage: 0.07
  },
  {
    wallet_address: "CaSLotZPGsxftpwnjx7jNg3ii5SoYZHN43e5EZZ9NSph",
    token_account: "GNxKVAYmhpE1KCLZdWycPi31q7xDLcTVGdFnvJeYZW72",
    balance: 6509.75,
    percentage: 0.07
  },
  {
    wallet_address: "Bsusydb9R3bs6FViWvWW8qGgedoXfe4PU8zduYGFQSsT",
    token_account: "64g1oucSkRo8P8amPMy5mtKpJLRfjdVUturswor7SqG8",
    balance: 6454.00,
    percentage: 0.07
  },
  {
    wallet_address: "2xJSWP8NCfEroUaDMSF6ucPG8Nr52nvS5d8EP16XPZ7r",
    token_account: "GnJnPhueuSCqV2reajdT6YyxGWk9actuQ1ThsSKUzyRg",
    balance: 6384.90,
    percentage: 0.06
  },
  {
    wallet_address: "GEvA9MYEZQB52djXKCx47QXZyfeTG3iZg4KWoy9WZrjP",
    token_account: "CP13D2VS32nub9ot7mJHM5YfbunNSD3XFM4sXic6b11H",
    balance: 6344.39,
    percentage: 0.06
  },
  {
    wallet_address: "ncgaRYS2kaDE85S94oAR5B3ALXA6425jXeCQGSSsrMu",
    token_account: "ncgaRYS2kaDE85S94oAR5B3ALXA6425jXeCQGSSsrMu",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "8qtvK52obif54UZRWCd8ZaNERzRMPo5Va6ZtnXFx23Ea",
    token_account: "9SpRJdZDsPcJqLRrZfmnjzp7WTn67vLqW5pb56fbR6HM",
    balance: 6313.55,
    percentage: 0.06
  },
  {
    wallet_address: "BCkcvpB8UgRC4WU2fDVpnugfZ6m9JfByS6se2wm3bqPq",
    token_account: "FMQwxNCfaFp3ESoL1khfmGZN5BUxKHhWmExJ8BMsYL8J",
    balance: 6019.75,
    percentage: 0.06
  },
  {
    wallet_address: "3s6c6JzbqgdDpnXrvdfJXhJLq6i9CeMh5JghFe72nBk4",
    token_account: "5rB1CtNtCupKfTks9Fb3f8ZgdEPxYCrNwTEWwgxjdMPZ",
    balance: 5149.00,
    percentage: 0.05
  },
  {
    wallet_address: "EgX22PDQjgQZjHCjs4Ysi14a6MRBFbmNjPvBkXYdL5i",
    token_account: "aHL6iWcf5AjVuhbtXXJ9mg1tNvcFBbxFAdyEbQTsPpk",
    balance: 4999.12,
    percentage: 0.05
  },
  {
    wallet_address: "BheyvBeuX6774SKnBxDt4yZiVAcgokXUB6gyn45ZCnJU",
    token_account: "58EMSzEuJsAg5VaubRvniBqhFQdhwVJMHRGXncffdsam",
    balance: 4815.02,
    percentage: 0.05
  },
  {
    wallet_address: "9zb7e5BJQFWmGSNLQ4tF4y8RQZX2i3LngYJrmZuE63AM",
    token_account: "5bzXMU1mNSZp1h3JgmKeNfsg4DncHyu8vrHWjfxa4FyA",
    balance: 4783.01,
    percentage: 0.05
  },
  {
    wallet_address: "7ZpjakapGPY8GhNGgPmGgSYXbMxQ8SP2MHLfKJMrzB6u",
    token_account: "DTXzXDeKSNVg5dCrXWAefZ7QqkooMkdDqc7gHd3nSMhN",
    balance: 4750.00,
    percentage: 0.05
  },
  {
    wallet_address: "6KNVw4ggXhhyVuTtH6X9rTE9SobRJqj8HiyU2u7jPZnS",
    token_account: "4PqK8sWMHutrpmq5TkexfVcPrXWYLH6JvVHv8M5JwjHe",
    balance: 4591.27,
    percentage: 0.05
  },
  {
    wallet_address: "9KNNKs7rhcB4KGobCX7JvwUTJoU6HTP3NKyC9rSGQoiS",
    token_account: "96CX7CzNBsEbisHpiiBPFsNXp3K2aHdaw5syQBQh7udj",
    balance: 4379.33,
    percentage: 0.04
  },
  {
    wallet_address: "EB7h7fFJX9y98jJoKsVeGFbnramBp5EnQuATZ6JYGPUK",
    token_account: "EckmVipf9hwV8Dc44GVEgkr28RxBvaeTA2NRD95fD1TP",
    balance: 3721.85,
    percentage: 0.04
  },
  {
    wallet_address: "Bg69rY9ThDUBg93TK7PtKekPomaYZugW3rM4TM9qaBQZ",
    token_account: "FfyEUXxZMGWvqTJiKn7yaJhFB3E5SuL8rpTjaVd3SMaF",
    balance: 3610.81,
    percentage: 0.04
  },
  {
    wallet_address: "FYcVDbsX1e1W8sgEwQuQexmVbs5CMP6rNbw56JA5xKMy",
    token_account: "7pkwyXpeyAkX6jzRtKXyU9hS7UwcqFUbiTZLZYXmu8aH",
    balance: 3011.00,
    percentage: 0.03
  },
  {
    wallet_address: "1kQjwEJTx6QSW3idk9VSVxfcXf34V5XpLEAq8uR4Knx",
    token_account: "HupyoHSj4qfxZCcLfQMGSShA4jqgbmznqYP92JpesexA",
    balance: 2921.06,
    percentage: 0.03
  },
  {
    wallet_address: "J1oUdSi2QPqJdJouV6WvP9q3hN2tTrk8hRD1sUSBxZxp",
    token_account: "2KeJTaDy173ut6wFMJqup2vAYk1fYT7FSr5spSaUjtkx",
    balance: 2789.61,
    percentage: 0.03
  },
  {
    wallet_address: "GvHHDfEdHUU7uERWXbw7Zf8FqwpcnYLiNdhc4yhNHFGZ",
    token_account: "2rDLbE9cEZenzhtz3sJM2awEqp9Uef14fz4kBPsSdLeY",
    balance: 2777.87,
    percentage: 0.03
  },
  {
    wallet_address: "8LCufX5VobcqYs99vKU7VZGLDeAZiSqPA3JKvMyfeQLq",
    token_account: "7Py8NDPSooUXC7hyoHcyMe7b3e7kp88A1ZKav34yUkvY",
    balance: 2540.64,
    percentage: 0.03
  },
  {
    wallet_address: "3R5KyuBsCtD8kA9iS87iqPNyda7GGhq9NPiTM3FJM8Py",
    token_account: "GSnSgAEpRhB7C2i6qhDvUBd87mjCaE4K2kuYQyTofZfe",
    balance: 2468.30,
    percentage: 0.02
  },
  {
    wallet_address: "AfLJnwaJ2gN5hm9jnp2f7xjMjyTsLNntJ8Ahs1Z2YptF",
    token_account: "DMU9vLCJRLy6UYxtLwSskD4SwiV38DbMZeNMQduEDyDH",
    balance: 2413.57,
    percentage: 0.02
  },
  {
    wallet_address: "8L5Aw7xmdQ7R7doGJRSgkhUW2nmSyqFGfxpAzLkfGtWs",
    token_account: "GBypDWtnN6ovu3isi6dfP9FuinE9Z51CD7xviUgKEZ2q",
    balance: 2362.86,
    percentage: 0.02
  },
  {
    wallet_address: "3ntkjbyazUeqES1giPpcGhzfyY6WRQoqkD8P2nZRpFiu",
    token_account: "H2zuj7iXURB8TPbb3uBiq1Z8deu9KrYRLCskndaHs8m2",
    balance: 2339.98,
    percentage: 0.02
  },
  {
    wallet_address: "AX2A587JzT14rMtL2pjqmL14sqYhZNKoMqvd2qbaLTvP",
    token_account: "bMB5WEywBo6cwXNfj2mQdEqKmsx3XDxZMF6e7nAB82J",
    balance: 2054.00,
    percentage: 0.02
  },
  {
    wallet_address: "2K1Xfg67SXeD9msYiu8s5zgaHg4mr6tcC1v7dzxoRSHv",
    token_account: "J5G2WykDxa23ZLAodRxsEJ64K692w6zNsMw4hCi6VRed",
    balance: 2000.00,
    percentage: 0.02
  },
  {
    wallet_address: "G4PZXXxDPiKYqAoQvEwGTqvKhojJkWQ7XNBgezUCkMur",
    token_account: "3dN3yw7ZWEB7wuRCcxtFVxwKXrGLz17U5UocNaUqJZSD",
    balance: 1945.41,
    percentage: 0.02
  },
  {
    wallet_address: "G1ibJHzkgJYMyExVEZmy1VsEsGUEYgd9gcfCyEykitGa",
    token_account: "3461XSvqgBnpu5bckHZqvtyWi8XnRiWgvgR4E1wSSXCV",
    balance: 1945.37,
    percentage: 0.02
  },
  {
    wallet_address: "BAQKSbacQcfrLNLHmL67qn8eJhus5nPHcvyxNGV8mDQs",
    token_account: "7V6mbw1rYXe7KFDfUNyi5pVpSw7RjrxkkBo2EofXV22E",
    balance: 1699.54,
    percentage: 0.02
  },
  {
    wallet_address: "WTGtVbrsN2mQg54yen36F5twviwx5S9PUDJVewAeG4B",
    token_account: "WTGtVbrsN2mQg54yen36F5twviwx5S9PUDJVewAeG4B",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "Gb8u7mjGxDEEobhatn4MRA69wTskvgcaNiA5bcrWZuda",
    token_account: "FpZw1QXZkTNXiCqHbUqW78Lw7AzY4kLDPuPVvuxSyhjQ",
    balance: 1593.40,
    percentage: 0.02
  },
  {
    wallet_address: "AawGZuDb4G4ofPY5ybB4rQVmrEZ6GfcjjzDMoHgbWsdC",
    token_account: "H9jKLDUszVvm1Ykfzck7ccxrZvQGq6eHPt6yfbjzoAN7",
    balance: 1500.00,
    percentage: 0.02
  },
  {
    wallet_address: "6rmSaChuk6q1ZMqp9b149pEckGXvxoReWfAmeU4HnB6n",
    token_account: "6MexooMZmrZvJmAcEyRyZjxMMbhANXYrG5yDe4DMr8UP",
    balance: 1389.35,
    percentage: 0.01
  },
  {
    wallet_address: "7d1x4FnP9SJGvtvZvjb7mMP3wztcNuEwBjMUqgUeg3ZL",
    token_account: "8cMxpqGCx9Y4AuFN5ehRuK38QFu3cnLLVUnAVMARrqJh",
    balance: 1367.21,
    percentage: 0.01
  },
  {
    wallet_address: "5w1hsmPeiAgTyKD3yvkVgX6o76wtw2nLpRW8Hfxejjjj",
    token_account: "Gw3mKPt79ihsb9p2whPQtTmKJfj2ZwDptgoQNFTuimn",
    balance: 1217.69,
    percentage: 0.01
  },
  {
    wallet_address: "NAYCNUU3rVykXa3R7i6zSbnQne5rPmzJpXNcNVt4nzS",
    token_account: "CWsij61x7KKb9CuXr1k2tG2Mh8yYFvvwaEzA741dSJLL",
    balance: 1200.00,
    percentage: 0.01
  },
  {
    wallet_address: "3GUyKaU3GNnYdrJYyJmzEki4nRsLXEkKPhF7jcFG1d6z",
    token_account: "H1W2F9XvSUyFqmCT9C6q1gsmNWsnY8i7reNrUoMzvmM8",
    balance: 1200.00,
    percentage: 0.01
  },
  {
    wallet_address: "7gPLL2cEUV14YUYGBpURQ6NnjSEY74frP96f1p9m3Knz",
    token_account: "D6KtJzpNXu4i7eBPnPR5ZGZTaDbuf3Pt6fdXJd25ytSb",
    balance: 1199.00,
    percentage: 0.01
  },
  {
    wallet_address: "4fPAJZ2h65QRuUnhZ4aUy1LB65TawjRuEA9VPvMFWx68",
    token_account: "8WXxKMeL6NE21PiJM2xYEqiMZu1P6B63GaEx3oX5XDrC",
    balance: 1181.00,
    percentage: 0.01
  },
  {
    wallet_address: "G5KTQDS8HgxmwR7VqZLKNcARw4fdvNoPgUtHt5e5W47X",
    token_account: "8kk1EfQ2eGF54y4xbTaQotobebbboE8xhuKw9669LvsQ",
    balance: 1167.14,
    percentage: 0.01
  },
  {
    wallet_address: "E26P5bbo6UePMZWvgQpmXLuywLaGWnczi6pDwwek7rir",
    token_account: "6U9FrjspbjVAmH8rnnRo3xk4QHSLqJX6Vd7CBGdfsB7r",
    balance: 1158.72,
    percentage: 0.01
  },
  {
    wallet_address: "fw6JqQqQQWeY7ePwGsK4qmGrvYuNdW6TegHzb7KqoDJ",
    token_account: "2raUNCyKGfodm6JUBvKUcuXtuHmaKRATvzLqcWNXuB8i",
    balance: 1060.00,
    percentage: 0.01
  },
  {
    wallet_address: "5MkbdBdH2WWevRnmP1yuAsWatV4tXpyjyuCKuTHbSLyc",
    token_account: "D7NzgDcaFzbJHcEQU8mhrAUQA3wgkFsE19Ertx2aRc1q",
    balance: 1058.88,
    percentage: 0.01
  },
  {
    wallet_address: "49W1LoM8o5zeUiwfvELRkBWrqcTAzfDnFQkG3QGRbAPi",
    token_account: "BkqL4GWrmy5AgndqKifdxrNwjXdQRC8yyNaQrHrVnzk5",
    balance: 1050.00,
    percentage: 0.01
  },
  {
    wallet_address: "28dqcPUP2MjY4kSHeTwh97uTd1CMbVCMj6Cep6iWDeVb",
    token_account: "CJshhaN2UiJMJpR3sXU69KNN2hjDEYVv6oYYjoMtJQve",
    balance: 1050.00,
    percentage: 0.01
  },
  {
    wallet_address: "AYsfPAsDyiw1GQpDFYEQBmd6q1QQ28A9pUMq9GNbNBYo",
    token_account: "C9eWVoGsAaqFVnxckKYBh2AKb1p3AsRH3aanKyUdXv33",
    balance: 1035.00,
    percentage: 0.01
  },
  {
    wallet_address: "9eqa8vdNhfj5891d8Ms9vKE4uaxts6rFQjcn4usvw7k1",
    token_account: "3d6crMNqa1arrqrQ18a9gUWi7fWoK9FYzdQVXt1MT2db",
    balance: 1033.37,
    percentage: 0.01
  },
  {
    wallet_address: "9t9w3CJiaJD7NmK2kmPFoE3Axbw75wQrn7VnKWJ6qbBV",
    token_account: "yM4sgU9rYwRgS2pneGxWLBXPCKKg46GXMDZNF9G7bTX",
    balance: 1011.65,
    percentage: 0.01
  },
  {
    wallet_address: "HizQqEqRP44esoFNXGsHecCTqWTmdwujaZn2jrxggZFK",
    token_account: "ETbNvkwyjDPEhAq6MRdyrfv3ZMJiNYYktTcucv6Kjmps",
    balance: 1000.00,
    percentage: 0.01
  },
  {
    wallet_address: "Cc5ZpghVDw7XnX14WKnBZMoQdJsNvT7kHojAseiEJWeT",
    token_account: "CRpX2tfo4YKZXbrCT4t3eaQ1vg8iCekEEQ2ihm7SkhBh",
    balance: 972.46,
    percentage: 0.01
  },
  {
    wallet_address: "CsCFJJAY1uX3WjaUP3xGBtkBrHUXCvFWHz6vsCGFaY4y",
    token_account: "5R4EMDqxQmAJSKJxewAy3tYfiU8wybTftwYpK3SdRxXD",
    balance: 966.90,
    percentage: 0.01
  },
  {
    wallet_address: "6VfYkRazYAou55K5gEawvNeggCM5v5gC9P7AL1iioR8b",
    token_account: "HvHVNjoVdT3L1bBhG7ecToHCSbtfYY82peD15i49WgS9",
    balance: 957.81,
    percentage: 0.01
  },
  {
    wallet_address: "5bFnhSNPtYnneCUFf66LPBHGRYiJGiD5ZTeN3tkJf894",
    token_account: "3MPyGxbAbH2ocUJhxK3ZoVMxDrTvxkNm2X5RmUiLHkhK",
    balance: 943.10,
    percentage: 0.01
  },
  {
    wallet_address: "6Yfv1M42hC5ZifYUX7B5nuswLSnFrynjAVD1wbVpWvo3",
    token_account: "JDYESQHduyrnSZCXJsfYPrR2XWEEmmYhJUaRoxGQ5RUy",
    balance: 914.00,
    percentage: 0.01
  },
  {
    wallet_address: "H32Dtu34yv5PMfWVGWN5xiMSwE263T8r8t8hYPvCCTm2",
    token_account: "4Q982xZWRjYDV11HkMoZnbawhKbYHtNrNBHhsHDofGm4",
    balance: 898.10,
    percentage: 0.01
  },
  {
    wallet_address: "FTMscZA2mvAK5g5vNjEciLpkEgiCXyG9M5bNiEJd3Zoe",
    token_account: "AzfVH4GzRKqM2YAZbte9PsMdENLe72ggQKjScj1SnbW9",
    balance: 840.80,
    percentage: 0.01
  },
  {
    wallet_address: "5eTZE5THFgWHCZ5BVCd6s4dMEvaZpkfCCortF5W89rAE",
    token_account: "HuWAR6Yrpmw4cqjMgk5YqK3zQ85wgFJm9MHcEGtqxdPV",
    balance: 828.41,
    percentage: 0.01
  },
  {
    wallet_address: "AjRgSetz5XTT5Zqb26FeV56tUqJLBorcTxQd19P5QDUt",
    token_account: "CftEYtGYXSwCc2t9NWQ3bVt4qZLRU6tkdJu1tBVTVujW",
    balance: 797.87,
    percentage: 0.01
  },
  {
    wallet_address: "3YvAd8zcavXmjUVK9YzhcR2Rty2kJ3rr5Wv7CWxNwv1P",
    token_account: "XmTcLimkT8q4VPa7gr8cRocrFHQgi7Cj5jAxXBkzmX1",
    balance: 783.85,
    percentage: 0.01
  },
  {
    wallet_address: "GSxyCP22cGMjVTnSNpnroBXRxLG45ubNfmDsZtLZShso",
    token_account: "J87vszAHFXxDCfUQWE5XeX8uDByzhkkL1nKwuQy3sWHS",
    balance: 774.55,
    percentage: 0.01
  },
  {
    wallet_address: "EjNgjaKwpiEwxtTbpUYpQpvCx9fPnBmPJRZCSmfjMK1y",
    token_account: "6n1HAkjD5LfXWyR2tWDfZfyb4juJnZpfGDTJaBAmzP3A",
    balance: 750.00,
    percentage: 0.01
  },
  {
    wallet_address: "8RbgcMr7NLrEQHS7GPWQXBNdzjSrgcQnqHCErW6Y9nF",
    token_account: "BEnFGDKjueVKcGnrLLjvuMyx738wyxgi61wwak6ymRDD",
    balance: 731.71,
    percentage: 0.01
  },
  {
    wallet_address: "HKSfqJb9BhuMcWMCAiuDc3g81DYMwia2r92DVxc8PgEQ",
    token_account: "65k9PmPo6zVdetXNDsyYWGx77KK33CCfQ8ytrb4Z7VZb",
    balance: 700.00,
    percentage: 0.01
  },
  {
    wallet_address: "C9xiFhke9pTU89YdNoLskuA64YNScWF42dmCJach13yh",
    token_account: "7ywUN3RUdut5QKoYihpFyL26chpQg3BvcbaCyZjWJodf",
    balance: 690.00,
    percentage: 0.01
  },
  {
    wallet_address: "JeqTLCEdFAQ5z8bU9XR9cN9hGrFKmFvr547BVa3Kw8S",
    token_account: "EK45WzYpoLHgGRRt3nMdbiBkupgEYoLcYwye229yLZDA",
    balance: 686.00,
    percentage: 0.01
  },
  {
    wallet_address: "CQQ9F1E9go5tSaHQMN1KAZMehZ5ovSstgLucwCXoQdb6",
    token_account: "2fBLChQeNiN2PNGQ7tpvaDtTrGKfkpeMZ4x2KZgA1Ln5",
    balance: 649.63,
    percentage: 0.01
  },
  {
    wallet_address: "B9HVBrcjceo635n7wuaHXkXSpGC9pCXKragyNfdhPPRT",
    token_account: "FzWMVSL32PPVXe9RFzVmeiY4Hr5BgnQ1VEZRD6MHBAM9",
    balance: 628.00,
    percentage: 0.01
  },
  {
    wallet_address: "5f9KaXL2EGMdwHRifCpFoju25bKBS17rqpEx79LUeP5F",
    token_account: "E6zwikFLN94cg1RkYLWEWwwEi8ya2ji6dt66HKJE8ryg",
    balance: 600.00,
    percentage: 0.01
  },
  {
    wallet_address: "9VcAKPaVmJc8ECBpwYg4VxzGFoxLFXVBkpsryJhoQfDs",
    token_account: "EDCx7p1EfeDa6yoMmrhgaV1PfoSZAwc3v5wKPqVSMjV4",
    balance: 577.85,
    percentage: 0.01
  },
  {
    wallet_address: "D4iqPdcy69b9Hrepjjnxv1rLrQzv5XVb7BbGBLRUimhP",
    token_account: "FJbTpf8uZdNJ9m7JcXLMJRn4fN7q8MQzAZjimADytiaF",
    balance: 560.25,
    percentage: 0.01
  },
  {
    wallet_address: "AhZftUN3QjZjVK9Hu8XcXFc1T3DJKzFPPsusoVpUCQ8d",
    token_account: "8yASo6nH93RxpvEXG2xQaxooS1XTiTSwoYYUdPC6d9fL",
    balance: 560.20,
    percentage: 0.01
  },
  {
    wallet_address: "EaWYvi9GSgjDUgYzjqSp696MANHp7rtMNcXurbBjNdjM",
    token_account: "5boAkyCxQivLucumZUaLmenZag3a2G9C54Y4fK1RktoJ",
    balance: 553.45,
    percentage: 0.01
  },
  {
    wallet_address: "3UYmZg6kK4DfT5tHMxpkc63HZ9odDup9FDxMimEhowC7",
    token_account: "Gv9VMor5wZrfNAeYEe8wiSCr7tQ4u23NjNi3ekUGks1u",
    balance: 534.00,
    percentage: 0.01
  },
  {
    wallet_address: "4x8Rqk4X1MWvz8R2kjwPQuqgMYGK5VpnUhWVojCfvJcS",
    token_account: "AxeuRgYm55F5E2MyuaFMFD3iff2ojqt41nE74o2brSiE",
    balance: 530.76,
    percentage: 0.01
  },
  {
    wallet_address: "6g91B5UeWn2knDtuewbGUkMdsnG8no2JEBLzX3RU4dvd",
    token_account: "CM5qg2K8FnGzFDdMMqqrTcbaDvAaEvpbjvkNVMM2cwqH",
    balance: 527.22,
    percentage: 0.01
  },
  {
    wallet_address: "HrqebbZyXrZSvqaCmTuWvEFhjJerZgKN2T7yGcHaobQv",
    token_account: "CuGq9LU45R2dc6A5CNPac8f8t4h82EPT1yTNMVUe5ZyT",
    balance: 513.17,
    percentage: 0.01
  },
  {
    wallet_address: "BEpkoGChmKStEhi5RzfPd83tAr3zguyMKhBswJ7AXyiK",
    token_account: "7BmEb1UCsAK7nTBNYHjiPKBAbfJVpLMGGjWR9JCZnsSG",
    balance: 504.00,
    percentage: 0.01
  },
  {
    wallet_address: "5RRzt5impbDhzGepEZj44JqTu7o6NmXNRKSM4rSQPX1z",
    token_account: "B3e8cef3rYAGYau9S4hViHrfV3Cmx8ZZSztXrHwWQPrB",
    balance: 501.88,
    percentage: 0.01
  },
  {
    wallet_address: "B86g7Y3XnE4rV6dpSqRUDtWVxCVPMEakzNWMjjR1yGpi",
    token_account: "2zWZGfKuzjuZigHVn9tJo4ogNAjYiiTkxsq6rXG63WG3",
    balance: 500.00,
    percentage: 0.01
  },
  {
    wallet_address: "3H7EcPm6XKNpchoQx51AwG8x7ShK8Msm6F7Q4dpd1Adn",
    token_account: "4PP2Hg5hHnn1irbffYwTHuDTbouNBFPDPUEtn5Bev2U1",
    balance: 500.00,
    percentage: 0.01
  },
  {
    wallet_address: "AnPGivgyhuZ2T8RVA5LHsyqEQqusUnrbi95sfGkCXwQg",
    token_account: "6iw5VkJe4fwcPepxPPucTciCU7kZy1dLvC3oyaT485Vq",
    balance: 500.00,
    percentage: 0.01
  },
  {
    wallet_address: "G32AABr9XXGnyroC5uGJUby7MN6BTsRzgyFYRT21DWam",
    token_account: "4snfEPgwi7AYNmJbHH9fLLd86j6i2bHtkZrwfP14D1U8",
    balance: 500.00,
    percentage: 0.01
  },
  {
    wallet_address: "ZXSy6BBL9kyRJp4JTGqBZQUjx3bHJTAn5tTQvBPU6Hy",
    token_account: "EBG8chSFRNEKsGpWUenQRfrwJVu5EMu9GwtYHdgMfG5c",
    balance: 500.00,
    percentage: 0.01
  },
  {
    wallet_address: "GLRsLZnPUx42mQnbPcsY4MrEwYnmon8UAjwiiiafRfka",
    token_account: "A2ZSmLyCtEEx36JpfFTWUeKTGTbDBmzMxAyRMLY4bEFR",
    balance: 500.00,
    percentage: 0.01
  },
  {
    wallet_address: "9RxFWo8xPr2is6mbKgXoPS82ENJoz7PDH395gN6u14z2",
    token_account: "HZrrKAWtF9bXek9qCbQTrijPPAjdHsxmAk2Cve75aeLS",
    balance: 500.00,
    percentage: 0.01
  },
  {
    wallet_address: "J4VQZL71uCNSCUHTkJtGRPGtmpi6ZztGTmCZMXvxhkHw",
    token_account: "9wM5kZfVwZ7Sr4rirXt6ZxCDuizsoreV39gwxbsuEx7r",
    balance: 500.00,
    percentage: 0.01
  },
  {
    wallet_address: "5rmnix8Y4jEDV4CqSMmg4nkqNdRACmd3crAfdPJ7gGke",
    token_account: "5mo8MpDETrmg1XSq7KHFYvxPQ1ySh5V7Jnmd77vAMmdN",
    balance: 500.00,
    percentage: 0.01
  },
  {
    wallet_address: "HbmuRzYnpG317EDwHU9iBSQkqpetTzPcUC4vvuHFnmZT",
    token_account: "2B83ZJestbWaQ9mZdpfCD46CcAgHuHUb84sJgDdREfFb",
    balance: 475.00,
    percentage: 0.00
  },
  {
    wallet_address: "4rvYDQXSwkVuiA7Fj3Mf4S5iX9TybuCS56vfBgdryeKR",
    token_account: "6uTqVsdF8jri9ARjEPgPwHDoX5FrqyJFqF8nx6he584D",
    balance: 450.00,
    percentage: 0.00
  },
  {
    wallet_address: "wj8rZJ9fpkHaMR2yU3Pjq5GSacumMqxqf4jw2rHZZkZ",
    token_account: "3qRtvSwSbGQ8oK66NYqTLNXQhCrj9GsdRAtbBBD1CVuV",
    balance: 425.79,
    percentage: 0.00
  },
  {
    wallet_address: "5bJjhR492DjHUkQLRzmzCzJuxHTZkGk4vYDN3gPKXAMQ",
    token_account: "8nftrYAMgdbaB9wa6yqEFeGNgGcnAWszgrmfgJPVm4hV",
    balance: 415.61,
    percentage: 0.00
  },
  {
    wallet_address: "Avh2zDG2LVzX5zFKZ2WEdGXkjvuFWWsefbZNumu7QHGU",
    token_account: "GzC2RRjcpENmgDwDSgLebVQ4okA5dhmnYxg84BqxkjCX",
    balance: 400.00,
    percentage: 0.00
  },
  {
    wallet_address: "2dBWhhpStkUHyWd8SH5HasAhtAbtdXRNzKm2ofKbFWZA",
    token_account: "9YRN9kMCZidaB4KGPwucoB7u5m3aAC17EnmHNkbDgh7F",
    balance: 376.00,
    percentage: 0.00
  },
  {
    wallet_address: "39DXh6ixjnhbTiHXco66NfDPLGabMJNMPaGX74bcmamB",
    token_account: "265hPBfYcCFGc5x9AFAfq6yY6wC2WTG9MjKUbMPM1ogj",
    balance: 373.40,
    percentage: 0.00
  },
  {
    wallet_address: "8UB7npYN1V1ZcCce99jfcSgsjzmiSPg2syW4C7wjJjCv",
    token_account: "3AvZfKTAzRZv7FwyC47B1oa2C98Zst1qx68rfhqLeCcw",
    balance: 362.81,
    percentage: 0.00
  },
  {
    wallet_address: "EL288J3qW7fcfzfUiwEo1eWmYon8dBCKmmdZNnF8hEgp",
    token_account: "E3Exy4uh8jBAfvktWPyPCcTVmABKRAbcUmp4ArQQZPgx",
    balance: 354.67,
    percentage: 0.00
  },
  {
    wallet_address: "2nXSqo1RuGojZzpgpDrUDe3aoBFETkovgicCAa8iRVHa",
    token_account: "8bzNa92n5T5MB2wMtcApMGXF5p9VZzo7ssfR8Qa8oCx5",
    balance: 350.00,
    percentage: 0.00
  },
  {
    wallet_address: "monf3Q8dwnu8Xx16sYNvn3AsezhmTWYZBrkC9sLZP8o",
    token_account: "9eryNP2naKgnJf6zEmG6KqiagU5QHuu89yGHEhnyB1DQ",
    balance: 318.40,
    percentage: 0.00
  },
  {
    wallet_address: "4Nk37hHNqDHwgVbJJ4MhAnig8JbgGxWsAQZkccR13qgs",
    token_account: "HEXN3mQF94Qu3y89WEyUcvN7KrmipMutxKqjLCNz3uca",
    balance: 296.00,
    percentage: 0.00
  },
  {
    wallet_address: "2V2nfYvM7jkr1rLKHQLA9m99xdzJ3x1XzmBaDqWcVpht",
    token_account: "J1q8QhEM2GMH5kroGbnaChnbgyFpspJrB5ZCU1QniZNS",
    balance: 280.00,
    percentage: 0.00
  },
  {
    wallet_address: "BKLxa1tVAJVMfXasTpYJZzNnWadbBk3BxrzAVAanaxuU",
    token_account: "EbQPbp6acXbUo8AUdupCRE4sUAmWuM3pizEwqzPHNNwq",
    balance: 280.00,
    percentage: 0.00
  },
  {
    wallet_address: "G1FG4g8i2K8DixqcMx5asZ6TtAmxVajceyBdhTrsntdR",
    token_account: "AdNTCovBxuvELXkXbvUzMALe11BwXb1V3JDVwQZHpZ8Z",
    balance: 273.34,
    percentage: 0.00
  },
  {
    wallet_address: "7dnj9uJQgibMg4AJ8rfhKAD5RMesA7HnNedmnush6AEH",
    token_account: "J6rZUdt2vqMgM3NNKSk9H6WwjLQNsHMBn5Vt2KKQ5zCV",
    balance: 260.00,
    percentage: 0.00
  },
  {
    wallet_address: "7TtxyiiJ8jGo8TL1wEhRvzYqty3f4ZY38GvM2sWFySkf",
    token_account: "6GwEe3c3ad6h4vnAQRoQ3QcS6VvT3ZXdMgBKfT7NC1z7",
    balance: 260.00,
    percentage: 0.00
  },
  {
    wallet_address: "7sbsQUGGypHRJMwrmjxXcr8MQfJmqzRyqZv3w3VGJhwr",
    token_account: "EHom3rAMGphXT9YHvVVmfYZSeLXizHfmFXVksLpE2fXe",
    balance: 244.12,
    percentage: 0.00
  },
  {
    wallet_address: "2cMhvtdgrBpYEBs6PHYRnrWFi3vYXoSEP59MJyEBeG6N",
    token_account: "EtkLKmajVHivHyJKqTB84K3aiq3tDRHTqig4Gv6WzYhf",
    balance: 240.00,
    percentage: 0.00
  },
  {
    wallet_address: "H1oJ18TDPkyRtYJRc1UE4Zf93gLiLFhrdpA9jnR8ZPP5",
    token_account: "7TNJ3ykFt413B2bCuEewjXJ1myr7esWXdLieT89bLKnb",
    balance: 225.76,
    percentage: 0.00
  },
  {
    wallet_address: "4H6FMvv375mL76tMTFcPCcYg4arLqRdpcbPhFUNURgjf",
    token_account: "26P4eW68y424akoVu5iZ6JtnxLFi9sREPrgiiiXAr2PH",
    balance: 220.28,
    percentage: 0.00
  },
  {
    wallet_address: "H9tgvK2keHjhjGZMptLCoXfYeceeM4judcQZ6WG8qAj5",
    token_account: "CfJCkdRHx6zpYaop7jWEarAJAhVLALrAzJXLM7GcfmE7",
    balance: 220.00,
    percentage: 0.00
  },
  {
    wallet_address: "ASF3M9SXSmuobEFg1uk2P6agRdkMWSeoCYkZu17rtnMt",
    token_account: "FTy5Hj5MJ1kNd87U5DrfW6pwDPatQrn6FoHDZU8inuSG",
    balance: 214.00,
    percentage: 0.00
  },
  {
    wallet_address: "EYzx42Pc2CKd4xMZmwQSmLMgdMxQjr6PvurysVKAFRFF",
    token_account: "DpdjmJ7gyFuiDs4qVVCmTTZwqE22uuii1sWNzjVy6Fdn",
    balance: 200.00,
    percentage: 0.00
  },
  {
    wallet_address: "BohjgmbjM3TRt2Q4zjkYrNJzUBqWxFNwoM1dKVRdDdRY",
    token_account: "6uZqoh9ixkQGkwqoeFM3STuzSUhZMegRtaGwvCxb1azx",
    balance: 200.00,
    percentage: 0.00
  },
  {
    wallet_address: "5hPtBzn75mq5kJfTRHb5oT17hJxdSqQg4MS6meoy8dVD",
    token_account: "CajXJTWNs7kGhJjdHo7TgDfvVeyDtyCpohSNa5xgrCJY",
    balance: 200.00,
    percentage: 0.00
  },
  {
    wallet_address: "6RpmFafqhvdNwMXaexQyJ8Vn2cuaVHqLjQTYu7nbufpZ",
    token_account: "4RE19kZkvjcYCeVwrd4RpjoQRmuKJVc3WSASK7WoS5A4",
    balance: 200.00,
    percentage: 0.00
  },
  {
    wallet_address: "AyvdpwkeoQryZpDdXhQiGvx9UQqLCBW6LMLKX96P5CBJ",
    token_account: "5J1c8QwaMrJXnGERSfti1hnGQrXtcxf4YRMy3iYxLy8R",
    balance: 200.00,
    percentage: 0.00
  },
  {
    wallet_address: "GtE3CSLun4kBfEVkDaSk4mj2QGG7DKJXKin9aZ3BQwPC",
    token_account: "iaahx9WVXouxsVj697CZCcNtfEccQQTnVdqfffmoZKM",
    balance: 200.00,
    percentage: 0.00
  },
  {
    wallet_address: "AXSZeaaTeE6zNN6brETuG5MMBg1REziLF3JtLaHcgwWt",
    token_account: "99cDKsSKdfBSBEFktoy1ouPrU85caynmo3738tFXxQDi",
    balance: 200.00,
    percentage: 0.00
  },
  {
    wallet_address: "GWUanfm6wqAFRVfH8EfjryQX3uQKwjWZc2k9WqeRW5av",
    token_account: "59pAn3WrZgT6rmm9aD87wAGJfjCfWDjH1bhGH3dDJhVw",
    balance: 200.00,
    percentage: 0.00
  },
  {
    wallet_address: "7mW8dV2wzvrmtFF9dAed5P59fD8DvUd4MiR47eQ4pyyR",
    token_account: "gj5aV9gFGGx7Fy2y45xwsKXuaoYmxntCiXM5rW57nF5",
    balance: 173.82,
    percentage: 0.00
  },
  {
    wallet_address: "99HxF57Tkb59Mam5JzTtKYvZSbCR1t47KdjpV4VBbuTf",
    token_account: "HciVhzTgrQoSd8XUFMpChVNhiTZo5sSoWceoEUpxhAAm",
    balance: 160.00,
    percentage: 0.00
  },
  {
    wallet_address: "Ejsn1duJ7ozyq6QrykZnXnmszejbRoMhvyexiQm3Vaph",
    token_account: "DzFrBZXQpSt6Nb3L8R1w4zYqHtVrGSaSLEQjh9pYyEYn",
    balance: 160.00,
    percentage: 0.00
  },
  {
    wallet_address: "EZEg4cuxM1qqPGhrgCjTSdUCPiK9u8Biey5ciDTmxixZ",
    token_account: "5EfQteWpCi5GmZBzXLZ9uuSYHtvGFAuB3edBCu6Ge83D",
    balance: 150.00,
    percentage: 0.00
  },
  {
    wallet_address: "CWwKmrM3b2gpMcK8Mvm8CR182LqkUU17sADBwPPFz2T3",
    token_account: "5Yris1R38xQoBriPb7UDZvzLrSrQZnRxnSg5JqoG39hi",
    balance: 132.00,
    percentage: 0.00
  },
  {
    wallet_address: "GgK1dZebiYPE1a5Q1CgPCeoCtHNuMsKutp2VSFRcjfyy",
    token_account: "7ZUzXxqsbU3oti784u2fUkKm99CA7Nb1b6sqxzdzgofT",
    balance: 127.95,
    percentage: 0.00
  },
  {
    wallet_address: "DWRhd6wTT7FZpQUof3fE7YxkmuXWXVLnnAhXG5X7Kppi",
    token_account: "Da7eebkfbb8rCiGzWYNLGhzpqMeEXEfdavjzispELhMn",
    balance: 109.82,
    percentage: 0.00
  },
  {
    wallet_address: "2HW4BLmC1m59NgYaYKz6NNAwNem5Jxo86FM8qiGdQBMG",
    token_account: "9UEzHuwdRf3TdH2pyTxRf9frEQ6YqWs4dGTifakf6QX3",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "4Yx7NZYPNtXAVZH3KRhge1AvJ9LRxEDXRNAyyRZwPvQK",
    token_account: "4Yx7NZYPNtXAVZH3KRhge1AvJ9LRxEDXRNAyyRZwPvQK",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "5Ks1ZLEsxMvtUQV6FUfyN5E6HXDqJhKhNwruhPZTYqtL",
    token_account: "5Ks1ZLEsxMvtUQV6FUfyN5E6HXDqJhKhNwruhPZTYqtL",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "5QKrYpVKnKJWiEEGvY3MeYYUZxJvJRosBqgzYcAqLWnh",
    token_account: "5QKrYpVKnKJWiEEGvY3MeYYUZxJvJRosBqgzYcAqLWnh",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "5rNwXZJvQxHJVqmhE5XYJJhKdGBfEWNUFxC8QEZp4CmB",
    token_account: "5rNwXZJvQxHJVqmhE5XYJJhKdGBfEWNUFxC8QEZp4CmB",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "6KNVw4ggXhhyVuTtH6X9rTE9SobRJqj8HiyU2u7jPZnS",
    token_account: "6KNVw4ggXhhyVuTtH6X9rTE9SobRJqj8HiyU2u7jPZnS",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "6rmSaChuk6q1ZMqp9b149pEckGXvxoReWfAmeU4HnB6n",
    token_account: "6rmSaChuk6q1ZMqp9b149pEckGXvxoReWfAmeU4HnB6n",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "7azqm8HWqiqZPrcgWoBbtNc9HykxpzK5zGTuiJXkpzNZ",
    token_account: "7azqm8HWqiqZPrcgWoBbtNc9HykxpzK5zGTuiJXkpzNZ",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "7CLRkmmn2KE87bF3ce4P67SVhj1VeXs4GjtpbTgt2ric",
    token_account: "7CLRkmmn2KE87bF3ce4P67SVhj1VeXs4GjtpbTgt2ric",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "7d1x4FnP9SJGvtvZvjb7mMP3wztcNuEwBjMUqgUeg3ZL",
    token_account: "7d1x4FnP9SJGvtvZvjb7mMP3wztcNuEwBjMUqgUeg3ZL",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "7EoZQLvw7F8f4xwWnHPFM6PttwyAT9uWFPVUuJEFDNxh",
    token_account: "7EoZQLvw7F8f4xwWnHPFM6PttwyAT9uWFPVUuJEFDNxh",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "7SzEGFW6bX2f1ULAJrHqvPipUAG4kc7N3Qt7iEnVKiqr",
    token_account: "7SzEGFW6bX2f1ULAJrHqvPipUAG4kc7N3Qt7iEnVKiqr",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "7ZpjakapGPY8GhNGgPmGgSYXbMxQ8SP2MHLfKJMrzB6u",
    token_account: "7ZpjakapGPY8GhNGgPmGgSYXbMxQ8SP2MHLfKJMrzB6u",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "8jUhXV2ZNbsjAJNQH22JhZMR1dBMYUtoHW4ASroUiXaz",
    token_account: "8jUhXV2ZNbsjAJNQH22JhZMR1dBMYUtoHW4ASroUiXaz",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "8L5Aw7xmdQ7R7doGJRSgkhUW2nmSyqFGfxpAzLkfGtWs",
    token_account: "8L5Aw7xmdQ7R7doGJRSgkhUW2nmSyqFGfxpAzLkfGtWs",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "8LCufX5VobcqYs99vKU7VZGLDeAZiSqPA3JKvMyfeQLq",
    token_account: "8LCufX5VobcqYs99vKU7VZGLDeAZiSqPA3JKvMyfeQLq",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "94Q2QhtrLUxL1txrgSJeXMi8jdkVTQK4EZphfT9LYsmE",
    token_account: "94Q2QhtrLUxL1txrgSJeXMi8jdkVTQK4EZphfT9LYsmE",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "9KNNKs7rhcB4KGobCX7JvwUTJoU6HTP3NKyC9rSGQoiS",
    token_account: "9KNNKs7rhcB4KGobCX7JvwUTJoU6HTP3NKyC9rSGQoiS",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "9ms5WgDa2e8z7HE7PD2ci3a2WnhQEZtP4dBJePhhdhXq",
    token_account: "9ms5WgDa2e8z7HE7PD2ci3a2WnhQEZtP4dBJePhhdhXq",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "9zb7e5BJQFWmGSNLQ4tF4y8RQZX2i3LngYJrmZuE63AM",
    token_account: "9zb7e5BJQFWmGSNLQ4tF4y8RQZX2i3LngYJrmZuE63AM",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "AawGZuDb4G4ofPY5ybB4rQVmrEZ6GfcjjzDMoHgbWsdC",
    token_account: "AawGZuDb4G4ofPY5ybB4rQVmrEZ6GfcjjzDMoHgbWsdC",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "AbwCmXYNyrpnApiRWzn9MmVEwGYq3FBvF1FTgoQLEVT",
    token_account: "AbwCmXYNyrpnApiRWzn9MmVEwGYq3FBvF1FTgoQLEVT",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "AfLJnwaJ2gN5hm9jnp2f7xjMjyTsLNntJ8Ahs1Z2YptF",
    token_account: "AfLJnwaJ2gN5hm9jnp2f7xjMjyTsLNntJ8Ahs1Z2YptF",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "AfVXtsmsbmeVDuYSTdEQdiJsYKsi8EKZEdzoTmRb8mQ",
    token_account: "AfVXtsmsbmeVDuYSTdEQdiJsYKsi8EKZEdzoTmRb8mQ",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "AX2A587JzT14rMtL2pjqmL14sqYhZNKoMqvd2qbaLTvP",
    token_account: "AX2A587JzT14rMtL2pjqmL14sqYhZNKoMqvd2qbaLTvP",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "AXSZeaaTeE6zNN6brETuG5MMBg1REziLF3JtLaHcgwWt",
    token_account: "AXSZeaaTeE6zNN6brETuG5MMBg1REziLF3JtLaHcgwWt",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "BAQKSbacQcfrLNLHmL67qn8eJhus5nPHcvyxNGV8mDQs",
    token_account: "BAQKSbacQcfrLNLHmL67qn8eJhus5nPHcvyxNGV8mDQs",
    balance: 100.00,
    percentage: 0.00
  },
  {
    wallet_address: "BCkcvpB8UgRC4WU2fDVpnugfZ6m9JfByS6se2wm3bqPq",
    token_account: "BCkcvpB8UgRC4WU2fDVpnugfZ6m9JfByS6se2wm3bqPq",
    balance: 100.00,
    percentage: 0.00
  }
];

async function importHolders() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Starting BUX holders import...');
    
    // Begin transaction
    await pool.query('BEGIN');

    try {
      let totalUpdated = 0;
      for (const holder of holders) {
        // Insert or update holder
        const result = await pool.query(
          `INSERT INTO bux_holders (wallet_address, balance)
           VALUES ($1, $2)
           ON CONFLICT (wallet_address) 
           DO UPDATE SET 
             balance = $2,
             last_updated = CURRENT_TIMESTAMP
           RETURNING *`,
          [holder.wallet_address, holder.balance]
        );

        if (result.rowCount > 0) {
          totalUpdated++;
          if (totalUpdated % 20 === 0) {
            console.log(`Progress: ${totalUpdated} holders processed...`);
          }
        }
      }

      // Commit transaction
      await pool.query('COMMIT');
      console.log(`Successfully imported ${totalUpdated} holders`);

    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error importing holders:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
console.log('Starting holder import script...');
importHolders()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 