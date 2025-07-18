/**
 * @typedef {Object} MonthlyModelBillResult
 * @property {string} modelName - 模型名称
 * @property {string} subType - LLM 类型
 * @property {string} unitAmount - 单价
 * @property {number} tokens - token 数量
 * @property {number} price - 总价格
 * @property {number} chargePrice - 实际收费价格
 * @property {number} freePrice - 免费额度价格
 */

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function onRequestPost(context) {
  const { request } = context
  const body = await request.json()
  const { cookie, month, modelType, subjectId } = body

  if (!cookie || !month || !subjectId) {
    return new Response(
      JSON.stringify({
        message: 'Missing parameters',
      }),
      {
        status: 400,
        headers: {
          'content-type': 'application/json; charset=UTF-8',
        },
      },
    )
  }

  const query = new URLSearchParams({
    month,
  })

  try {
    const resp = await fetch(`https://cloud.siliconflow.cn/biz-server/api/v1/invoices/month_detail_model?${query}`, {
      headers: {
        cookie,
        'X-Subject-id': subjectId,
      },
      eo: {
        cacheTtl: 0,
      },
    })
    const bodyText = await resp.text()
    if (bodyText.includes('登录')) {
      return new Response(
        JSON.stringify({
          message: 'Cookie 失效',
        }),
        {
          status: 401,
          headers: {
            'content-type': 'application/json; charset=UTF-8',
          },
        },
      )
    }
    const respBody = JSON.parse(bodyText)

    if (!respBody.status || !respBody.data?.results) {
      return new Response(
        JSON.stringify({
          message: `硅基流动 API 返回报错：${respBody.message}`,
        }),
        {
          status: respBody.code || 500,
          headers: {
            'content-type': 'application/json; charset=UTF-8',
          },
        },
      )
    }

    /** @type {MonthlyModelBillResult[]} */
    let results = respBody.data.results.map((model) => ({
      modelName: model.modelName,
      subType: model.subType,
      unitAmount: model.unitAmount,
      tokens: model.tokens,
      price: parseFloat(model.amount),
      chargePrice: parseFloat(model.chargeAmount),
      freePrice: parseFloat(model.freeAmount),
    }))

    // 如果指定了模型类型且不是 'all'，则进行过滤
    if (modelType && modelType !== 'all') {
      results = results.filter((model) => model.subType === modelType)
    }

    return new Response(JSON.stringify(results), {
      headers: {
        'content-type': 'application/json; charset=UTF-8',
      },
    })
  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({
        message: 'Failed to fetch bill data',
      }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json; charset=UTF-8',
        },
      },
    )
  }
}
