import { LP, UUSD } from "../../constants"
import MESSAGE from "../../lang/MESSAGE.json"
import Tooltip from "../../lang/Tooltip.json"
import { plus, times, sum, gt } from "../../libs/math"
import { formatAsset } from "../../libs/parse"
import { percent } from "../../libs/num"
import getLpName from "../../libs/getLpName"
import { getPath, MenuKey } from "../../routes"
import { useContractsAddress, useContract, useRefetch } from "../../hooks"
import { BalanceKey, PriceKey } from "../../hooks/contractKeys"

import Card from "../../components/Card"
import Table from "../../components/Table"
import { Di } from "../../components/Dl"
import { TooltipIcon } from "../../components/Tooltip"
import Delisted from "../../components/Delisted"
import DashboardActions from "../../components/DashboardActions"
import usePool from "../../forms/usePool"
import usePoolShare from "../../forms/usePoolShare"

import { Type } from "../Pool"
import { Type as StakeType } from "../Stake"
import NoAssets from "./NoAssets"

const Pool = () => {
  const priceKey = PriceKey.PAIR
  const keys = [
    priceKey,
    BalanceKey.TOKEN,
    BalanceKey.LPTOTAL,
    BalanceKey.LPSTAKED,
  ]

  const { data } = useRefetch(keys)

  /* context */
  const { listedAll } = useContractsAddress()
  const { result, find } = useContract()
  const getPool = usePool()
  const getPoolShare = usePoolShare()
  const loading = keys.some((key) => result[key].loading)

  /* table */
  const dataSource = !data
    ? []
    : listedAll
        .filter(({ token }) => gt(find(BalanceKey.LPTOTAL, token), 0))
        .map((item) => {
          const { token } = item

          return {
            ...item,
            balance: find(BalanceKey.LPTOTAL, token),
            stakable: find(BalanceKey.LPSTAKABLE, token),
          }
        })

  /* render */
  const dataExists = !!dataSource.length

  const getAssetValue = (asset: Asset) => {
    const price = find(priceKey, asset.token)
    return times(asset.amount, price)
  }

  const totalWithdrawable = sum(
    dataSource.map(({ balance, token }) => {
      const { fromLP } = getPool({ amount: balance, token })
      const assetValue = fromLP && getAssetValue(fromLP.asset)
      return plus(fromLP?.uusd.amount, assetValue)
    })
  )

  const description = dataExists && (
    <Di
      title="Total Withdrawable Value"
      content={
        <TooltipIcon content={Tooltip.My.TotalWithdrawableValue}>
          {formatAsset(totalWithdrawable, UUSD)}
        </TooltipIcon>
      }
    />
  )

  return (
    <Card
      title={<TooltipIcon content={Tooltip.My.Pool}>Pool</TooltipIcon>}
      description={description}
      loading={loading}
    >
      {dataExists ? (
        <Table
          columns={[
            {
              key: "symbol",
              title: "Pool Name",
              render: (symbol, { status }) => (
                <>
                  {status === "DELISTED" && <Delisted />}
                  {getLpName(symbol)}
                </>
              ),
              bold: true,
            },
            {
              key: "balance",
              title: (
                <TooltipIcon content={Tooltip.My.LP}>LP Balance</TooltipIcon>
              ),
              render: (value) => formatAsset(value, LP),
              align: "right",
            },
            {
              key: "withdrawable",
              title: (
                <TooltipIcon content={Tooltip.My.Withdrawable}>
                  Withdrawable Asset
                </TooltipIcon>
              ),
              dataIndex: "balance",
              render: (amount, { token }) => {
                const { text } = getPool({ amount, token })
                return text.fromLP
              },
              align: "right",
            },
            {
              key: "share",
              title: (
                <TooltipIcon content={Tooltip.My.PoolShare}>
                  Pool share
                </TooltipIcon>
              ),
              dataIndex: "balance",
              render: (amount, { token }) => {
                const poolShare = getPoolShare({ amount, token })
                const { ratio, lessThanMinimum, minimum } = poolShare
                const prefix = lessThanMinimum ? "<" : ""
                return prefix + percent(lessThanMinimum ? minimum : ratio)
              },
              align: "right",
            },
            {
              key: "actions",
              dataIndex: "token",
              render: (token) => {
                const to = {
                  pathname: getPath(MenuKey.POOL),
                  state: { token },
                }

                const stake = `${getPath(MenuKey.STAKE)}/${token}`

                const list = [
                  {
                    to: { ...to, hash: Type.PROVIDE },
                    children: Type.PROVIDE,
                    disabled: !gt(find(BalanceKey.TOKEN, token), 0),
                  },
                  {
                    to: { ...to, hash: Type.WITHDRAW },
                    children: Type.WITHDRAW,
                  },
                  {
                    to: stake,
                    children: StakeType.STAKE,
                  },
                ]

                return <DashboardActions list={list} />
              },
              align: "right",
              fixed: "right",
            },
          ]}
          dataSource={dataSource}
        />
      ) : (
        !loading && (
          <NoAssets
            description={MESSAGE.MyPage.Empty.Pool}
            link={MenuKey.POOL}
          />
        )
      )}
    </Card>
  )
}

export default Pool
