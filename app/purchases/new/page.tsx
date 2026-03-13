"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function NewPurchasePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // 检查登录状态
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // 表单字段
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [buyLink, setBuyLink] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [processorContact, setProcessorContact] = useState("");
  const [materialCategory, setMaterialCategory] = useState("");
  const [isAdvancedPayment, setIsAdvancedPayment] = useState(false);
  const [advancerName, setAdvancerName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // 上传图片（如果有）
      let imageUrl = "";
      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append("file", imageFile);
        const imageRes = await fetch("/api/upload", {
          method: "POST",
          credentials: 'include',
          body: imageFormData,
        });
        if (!imageRes.ok) {
          throw new Error("图片上传失败");
        }
        const imageData = await imageRes.json();
        imageUrl = imageData.url;
      }

      // 上传 PDF（如果有）
      let pdfUrl = "";
      let fileName = "";
      if (pdfFile) {
        const pdfFormData = new FormData();
        pdfFormData.append("file", pdfFile);
        const pdfRes = await fetch("/api/upload", {
          method: "POST",
          credentials: 'include',
          body: pdfFormData,
        });
        if (!pdfRes.ok) {
          throw new Error("PDF 上传失败");
        }
        const pdfData = await pdfRes.json();
        pdfUrl = pdfData.url;
        fileName = pdfData.fileName;
      }

      // 提交采购数据
      const purchaseRes = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          itemName,
          amount: parseFloat(amount),
          currency,
          buyLink: buyLink || null,
          imageUrl: imageUrl || null,
          pdfUrl: pdfUrl || null,
          fileName: fileName || null,
          note: note || null,
          category: category || null,
          processorContact: processorContact || null,
          materialCategory: materialCategory || null,
          hasInvoice: pdfFile !== null,
          isAdvancedPayment: isAdvancedPayment,
          advancerName: advancerName || null,
        }),
      });

      if (!purchaseRes.ok) {
        const err = await purchaseRes.json();
        throw new Error(err.message || "提交失败");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 如果正在检查会话或未登录，显示加载中或空白
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">检查登录状态...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // useEffect 会重定向，这里留空
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          &larr; 返回仪表盘
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">提交新采购信息</h1>
        <p className="mt-2 text-gray-600">
          填写采购物品的详细信息，上传相关图片和发票 PDF。
        </p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            ✅ 采购信息提交成功！正在跳转回仪表盘...
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">❌ {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              物品名称 *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="例如：MacBook Pro 16寸"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              总金额 (¥) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            采购类型 *
          </label>
          <select
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">请选择采购类型</option>
            <option value="电子元件">电子元件</option>
            <option value="加工定制件">加工定制件</option>
            <option value="紧固件">紧固件</option>
            <option value="仪器">仪器</option>
            <option value="差旅费">差旅费</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              物资类别 *
            </label>
            <select
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              value={materialCategory}
              onChange={(e) => setMaterialCategory(e.target.value)}
            >
              <option value="">请选择物资类别</option>
              <option value="车队资产">车队资产</option>
              <option value="耗材">耗材</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              是否垫付
            </label>
            <div className="flex items-center h-10">
              <input
                type="checkbox"
                checked={isAdvancedPayment}
                onChange={(e) => setIsAdvancedPayment(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">垫付</span>
            </div>
          </div>
          <div>
            {isAdvancedPayment ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  垫付人 *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="请输入垫付人姓名"
                  value={advancerName}
                  onChange={(e) => setAdvancerName(e.target.value)}
                />
              </>
            ) : (
              <div className="h-10"></div> /* 占位保持高度一致 */
            )}
          </div>
        </div>

        {category === "加工定制件" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              加工商联系方式 *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="例如：电话/微信/邮箱"
              value={processorContact}
              onChange={(e) => setProcessorContact(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            购买链接（可选）
          </label>
          <input
            type="url"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="https://example.com/product"
            value={buyLink}
            onChange={(e) => setBuyLink(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            备注（可选）
          </label>
          <textarea
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="补充说明，例如采购原因、使用场景等"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              物品图片（可选）
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer text-indigo-600 hover:text-indigo-800"
              >
                {imageFile ? (
                  <div>
                    <p className="font-medium">{imageFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(imageFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">点击选择图片</p>
                    <p className="text-sm text-gray-500">支持 JPG, PNG, GIF</p>
                  </div>
                )}
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              发票 PDF（可选）
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfChange}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="cursor-pointer text-indigo-600 hover:text-indigo-800"
              >
                {pdfFile ? (
                  <div>
                    <p className="font-medium">{pdfFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(pdfFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">点击选择 PDF 发票</p>
                    <p className="text-sm text-gray-500">支持 PDF 文件</p>
                  </div>
                )}
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              管理员下载时会自动以采购信息命名该文件。
            </p>
          </div>
        </div>

        <div className="pt-6 border-t flex justify-end space-x-4">
          <Link
            href="/dashboard"
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "提交中..." : "提交采购"}
          </button>
        </div>
      </form>
    </div>
  );
}