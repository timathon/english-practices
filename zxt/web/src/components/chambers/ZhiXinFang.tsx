import React, { useState } from 'react';
import { AvatarDisplay, PIXEL_PRESET_BASES, PIXEL_ACCESSORY_OPTIONS, PIXEL_HALO_COLORS, AvatarConfig, DEFAULT_AVATAR_CONFIG } from '../AvatarDisplay';




interface ZhiXinFangProps {
  user: any;
  onUpdateAvatar?: (config: AvatarConfig) => void;
}

export const ZhiXinFang: React.FC<ZhiXinFangProps> = ({ user, onUpdateAvatar }) => {
  const [activeTab, setActiveTab] = useState<'avatar' | 'shop'>('avatar');
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => {
    return user?.avatarConfig || DEFAULT_AVATAR_CONFIG;
  });
  const [userGems, setUserGems] = useState<number>(user?.points || 120);

  const handleSelectOption = (key: keyof AvatarConfig, value: string) => {
    const updated = { ...avatarConfig, [key]: value };
    setAvatarConfig(updated);
    if (onUpdateAvatar) {
      onUpdateAvatar(updated);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-purple-300 font-medium mb-1 text-sm">
              <span>知新堂 · 第三重天</span>
              <span>•</span>
              <span className="bg-purple-800/60 px-2 py-0.5 rounded text-xs">知新坊 Innovation Lab</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-serif">知新使者造型工坊 & 星石阁</h1>
            <p className="text-purple-200/80 text-sm mt-1">
              用做作业积累的【知新星石】打造你的独一无二“知新使者”形象与个人修炼室。
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20">
            <span className="text-2xl">💎</span>
            <div>
              <div className="text-xs text-purple-200">知新星石 (Star Gems)</div>
              <div className="text-xl font-bold text-amber-300">{userGems}</div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mt-6 border-b border-white/15 pb-0">
          <button
            onClick={() => setActiveTab('avatar')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-all ${
              activeTab === 'avatar'
                ? 'bg-white text-indigo-950 shadow-lg'
                : 'text-purple-200 hover:text-white hover:bg-white/10'
            }`}
          >
            🎨 使者形象设计 (Avatar Studio)
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-all ${
              activeTab === 'shop'
                ? 'bg-white text-indigo-950 shadow-lg'
                : 'text-purple-200 hover:text-white hover:bg-white/10'
            }`}
          >
            🏪 星石商铺 (Rewards Shop)
          </button>
        </div>
      </div>

      {activeTab === 'avatar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Avatar Live Preview */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-md border border-slate-200/80 flex flex-col items-center justify-center text-center">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>✨</span> 当前知新使者 Preview
            </h2>

            <div className="relative my-4">
              <AvatarDisplay config={avatarConfig} size="xl" className="shadow-2xl ring-4 ring-purple-400/30" />
            </div>

            <div className="mt-4 bg-slate-50 rounded-xl p-4 w-full border border-slate-100">
              <div className="font-semibold text-slate-700 text-sm">{user?.name || '知新使者'}</div>
              <div className="text-xs text-slate-500 mt-0.5">{user?.className || '三年级'} · 初级学士</div>
              <div className="mt-3 flex justify-center gap-2 text-xs">
                <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded">星光护体</span>
                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded">温故知新</span>
              </div>
            </div>

            <button
              onClick={() => alert('使者形象已成功保存并同步到导航栏！')}
              className="mt-6 w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md transition"
            >
              💾 保存形象设置
            </button>
          </div>

          {/* Controls Panel */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-md border border-slate-200/80 space-y-6">
            {/* Character Base Presets */}
            <div>
              <label className="text-sm font-bold text-slate-800 mb-2 block">选择使者角色底模 (Select Base Character)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PIXEL_PRESET_BASES.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectOption('preset', preset.id as any)}
                    className={`p-3 rounded-xl border text-left text-xs transition flex items-center gap-3 ${
                      avatarConfig.preset === preset.id
                        ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <AvatarDisplay config={{ preset: preset.id as any, accessory: 'none' }} size="sm" />
                    <div>
                      <div className="font-bold flex items-center gap-1 text-sm">
                        <span>{preset.icon}</span> {preset.name}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{preset.desc}</div>
                    </div>

                  </button>
                ))}
              </div>
            </div>

            {/* Overlay Accessories */}
            <div>
              <label className="text-sm font-bold text-slate-800 mb-2 block">佩戴随身法宝/装备 (Equip Accessory)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PIXEL_ACCESSORY_OPTIONS.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectOption('accessory', acc.id as any)}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 ${
                      avatarConfig.accessory === acc.id
                        ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="text-lg">{acc.icon}</span>
                    <span>{acc.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Energy Aura Colors */}
            <div>
              <label className="text-sm font-bold text-slate-800 mb-2 block">护体能量灵光 (Energy Aura Halo)</label>
              <div className="flex gap-3">
                {PIXEL_HALO_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleSelectOption('bgHalo', color)}
                    className={`w-9 h-9 rounded-full border-2 transition ${
                      avatarConfig.bgHalo === color ? 'scale-110 border-purple-600 ring-2 ring-purple-600/40 shadow-md' : 'border-white shadow'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>



          </div>
        </div>
      ) : (
        /* Star Gems Rewards Shop */
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>💎</span> 星石兑换阁
          </h2>
          <p className="text-slate-600 text-sm mb-6">完成每日作业与温故练习即可获得知新星石，解锁专属装扮与法宝。</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'robe_gold', title: '金华锦绣儒袍', cost: 150, icon: '👘', desc: '相传由文昌帝君赐予的玄金礼服' },
              { id: 'scifi_visor', title: '观星高能战镜', cost: 200, icon: '🥽', desc: '可实时检测空气污染与题目隐形提示' },
              { id: 'pet_egg_preview', title: '灵兽守护蛋 (赛季预览)', cost: 300, icon: '🥚', desc: 'Phase 3 灵兽舱孵化专属伙伴' }
            ].map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-purple-300 transition">
                <div>
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <h3 className="font-bold text-slate-800 text-base">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-amber-600 text-sm flex items-center gap-1">
                    <span>💎</span> {item.cost} 星石
                  </span>
                  <button
                    onClick={() => {
                      if (userGems >= item.cost) {
                        setUserGems(userGems - item.cost);
                        alert(`成功兑换 ${item.title}！`);
                      } else {
                        alert('知新星石不足，快去正堂完成作业赚取吧！');
                      }
                    }}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition"
                  >
                    兑换
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
